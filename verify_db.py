import sqlite3
import os

# Use an absolute path to ensure we're looking at the correct database file
db_path = os.path.abspath('pid_visualizer.db')
print(f"Querying database at: {db_path}")

if not os.path.exists(db_path):
    print("Database file does not exist.")
else:
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check for line_numbers table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='line_numbers';")
        if cursor.fetchone():
            # Query the line_numbers table
            cursor.execute("SELECT * FROM line_numbers;")
            rows = cursor.fetchall()
            
            print(f"\nFound {len(rows)} rows in the 'line_numbers' table.")
            
            if rows:
                # Get column names
                column_names = [description[0] for description in cursor.description]
                print("\nColumns:", column_names)
                print("-" * 30)
                
                # Print a few rows as examples
                for row in rows[:5]:
                    print(row)
        else:
            print("Table 'line_numbers' does not exist.")

        print("\n" + "="*30 + "\n")

        # Check for ocr_results table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ocr_results';")
        if cursor.fetchone():
            # Query the ocr_results table
            cursor.execute("SELECT COUNT(*) FROM ocr_results;")
            count = cursor.fetchone()[0]
            print(f"Found {count} rows in the 'ocr_results' table.")
        else:
            print("Table 'ocr_results' does not exist.")

        # Close the connection
        conn.close()
    except Exception as e:
        print(f"An error occurred: {e}") 