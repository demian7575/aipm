from pathlib import Path

from .main import export_openapi


if __name__ == "__main__":
    destination = Path(__file__).parent / "docs" / "openapi.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    export_openapi(destination)
    print(f"OpenAPI schema written to {destination}")
