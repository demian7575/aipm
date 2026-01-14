#!/bin/bash
# 초고속 DynamoDB 복사 - 대기 시간 최소화

set -e
echo "⚡ 초고속 DynamoDB 복사 시작..."

REGION="us-east-1"

declare -A TABLE_MAPPINGS=(
    ["aipm-backend-prod-stories"]="aipm-backend-dev-stories"
    ["aipm-backend-prod-acceptance-tests"]="aipm-backend-dev-acceptance-tests"
    ["aipm-backend-prod-prs"]="aipm-backend-dev-prs"
)

super_fast_copy() {
    local source_table=$1
    local target_table=$2
    
    echo "⚡ 초고속 복사: $source_table -> $target_table"
    
    # 1. 대기 없이 테이블 삭제 (백그라운드)
    aws dynamodb delete-table --table-name "$target_table" --region "$REGION" 2>/dev/null || true
    
    # 2. 즉시 스캔 시작 (삭제 대기 안함)
    echo "📊 데이터 스캔 중..."
    aws dynamodb scan --table-name "$source_table" --region "$REGION" > /tmp/${source_table}_data.json
    
    # 3. 스키마 정보 가져오기
    aws dynamodb describe-table --table-name "$source_table" --region "$REGION" | \
    jq --arg new_name "$target_table" '
        .Table | 
        {
            TableName: $new_name,
            KeySchema: .KeySchema,
            AttributeDefinitions: .AttributeDefinitions,
            BillingMode: "PAY_PER_REQUEST"
        }
    ' > /tmp/${target_table}_schema.json
    
    # 4. 이제 삭제 완료까지 대기 (병렬로 처리됨)
    echo "🗑️ 테이블 삭제 완료 대기..."
    aws dynamodb wait table-not-exists --table-name "$target_table" --region "$REGION" 2>/dev/null || true
    
    # 5. 새 테이블 생성
    echo "🏗️ 테이블 생성 중..."
    aws dynamodb create-table --region "$REGION" --cli-input-json file:///tmp/${target_table}_schema.json
    aws dynamodb wait table-exists --table-name "$target_table" --region "$REGION"
    
    # 6. 데이터 일괄 삽입
    echo "📥 데이터 삽입 중..."
    jq -r '.Items[] | @base64' /tmp/${source_table}_data.json | \
    while read item; do
        echo "$item" | base64 --decode | \
        jq -r --arg table "$target_table" '{($table): [{PutRequest: {Item: .}}]}' | \
        aws dynamodb batch-write-item --region "$REGION" --request-items file:///dev/stdin 2>/dev/null || true
    done
    
    # 7. 임시 파일 정리
    rm -f /tmp/${source_table}_data.json /tmp/${target_table}_schema.json
    
    echo "✅ 완료: $source_table -> $target_table"
}

# 모든 테이블 병렬 복사
for source_table in "${!TABLE_MAPPINGS[@]}"; do
    target_table="${TABLE_MAPPINGS[$source_table]}"
    super_fast_copy "$source_table" "$target_table" &
done
wait

echo "⚡ 초고속 DynamoDB 복사 완료!"
