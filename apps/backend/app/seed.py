from __future__ import annotations

from .main import load_seed


if __name__ == "__main__":
    import asyncio

    asyncio.run(load_seed())
    print("Seed data loaded into in-memory store.")
