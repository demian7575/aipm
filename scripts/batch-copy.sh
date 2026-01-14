#!/bin/bash
# 배치 삭제 + 배치 복사 (테이블 재생성 없음)

set -e
echo "🚀 배치 삭제+복사 시작..."

REGION="us-east-1"

declare -A TABLE_MAPPINGS=(
    ["aipm-backend-prod-stories"]="aipm-backend-dev-stories"
    ["aipm-backend-prod-acceptance-tests"]="aipm-backend-dev-acceptance-tests"
    ["aipm-backend-prod-prs"]="aipm-backend-dev-prs"
)

batch_copy() {
    local source_table=$1
    local target_table=$2
    
    echo "🚀 배치 복사: $source_table -> $target_table"
    
    # 1. 타겟 테이블의 모든 키 가져오기 (삭제용)
    echo "🔍 기존 데이터 키 수집..."
    aws dynamodb scan \
        --table-name "$target_table" \
        --projection-expression "id" \
        --region "$REGION" 2>/dev/null | \
    jq -r '.Items[] | @base64' > /tmp/${target_table}_keys.txt || touch /tmp/${target_table}_keys.txt
    
    # 2. 소스 데이터 가져오기
    echo "📊 소스 데이터 수집..."
    aws dynamodb scan \
        --table-name "$source_table" \
        --region "$REGION" | \
    jq -r '.Items[] | @base64' > /tmp/${source_table}_data.txt
    
    # 3. 배치 삭제 (25개씩)
    if [ -s /tmp/${target_table}_keys.txt ]; then
        echo "🗑️ 기존 데이터 배치 삭제..."
        split -l 25 /tmp/${target_table}_keys.txt /tmp/delete_batch_
        for batch_file in /tmp/delete_batch_*; do
            if [ -s "$batch_file" ]; then
                echo "{\"$target_table\": [" > /tmp/delete_request.json
                first=true
                while read key_data; do
                    if [ "$first" = true ]; then
                        first=false
                    else
                        echo "," >> /tmp/delete_request.json
                    fi
                    echo "$key_data" | base64 --decode | \
                    jq -r '{DeleteRequest: {Key: {id: .id}}}' >> /tmp/delete_request.json
                done < "$batch_file"
                echo "]}" >> /tmp/delete_request.json
                
                aws dynamodb batch-write-item \
                    --region "$REGION" \
                    --request-items file:///tmp/delete_request.json 2>/dev/null || true
                rm "$batch_file"
            fi
        done
    fi
    
    # 4. 배치 삽입 (25개씩)
    echo "📥 새 데이터 배치 삽입..."
    split -l 25 /tmp/${source_table}_data.txt /tmp/insert_batch_
    for batch_file in /tmp/insert_batch_*; do
        if [ -s "$batch_file" ]; then
            echo "{\"$target_table\": [" > /tmp/insert_request.json
            first=true
            while read item_data; do
                if [ "$first" = true ]; then
                    first=false
                else
                    echo "," >> /tmp/insert_request.json
                fi
                echo "$item_data" | base64 --decode | \
                jq -r '{PutRequest: {Item: .}}' >> /tmp/insert_request.json
            done < "$batch_file"
            echo "]}" >> /tmp/insert_request.json
            
            aws dynamodb batch-write-item \
                --region "$REGION" \
                --request-items file:///tmp/insert_request.json 2>/dev/null || true
            rm "$batch_file"
        fi
    done
    
    # 5. 임시 파일 정리
    rm -f /tmp/${target_table}_keys.txt /tmp/${source_table}_data.txt
    rm -f /tmp/delete_request.json /tmp/insert_request.json
    
    echo "✅ 완료: $source_table -> $target_table"
}

# 모든 테이블 병렬 처리
for source_table in "${!TABLE_MAPPINGS[@]}"; do
    target_table="${TABLE_MAPPINGS[$source_table]}"
    batch_copy "$source_table" "$target_table" &
done
wait

echo "🚀 배치 삭제+복사 완료!"
