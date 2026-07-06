import sys
from services import process_due_recurring


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "process-recurring":
        count = process_due_recurring()
        print(f"Processed {count} recurring transaction(s)")
    else:
        import uvicorn
        uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
