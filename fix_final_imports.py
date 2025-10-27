#!/usr/bin/env python3
"""
Fix final import issues
"""

import os
import sys

def replace_in_file(filepath, old_text, new_text):
    """Replace text in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if old_text in content:
            content = content.replace(old_text, new_text)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"   ERROR: {e}")
        return False

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    src_dir = os.path.join(script_dir, 'src')
    
    if not os.path.exists(src_dir):
        print("ERROR: Cannot find src/ directory")
        sys.exit(1)
    
    print("Fixing final import issues...")
    print()
    
    changes = 0
    
    # Fix mapping-row.tsx relative import
    print("1. Fixing mapping-row.tsx...")
    mapping_row = os.path.join(src_dir, 'components', 'mapping-row.tsx')
    if replace_in_file(mapping_row, 
                      'from "../lib/field-options"',
                      'from "@/lib/utils/field-options"'):
        print("   SUCCESS: Fixed import")
        changes += 1
    else:
        print("   SKIPPED: Already fixed or not found")
    
    print()
    print(f"Complete! Fixed {changes} import(s)")
    print()
    print("Remaining issues need manual fixes:")
    print("1. csv-storage.ts - Download the updated version")
    print("2. simplified-upload-component.tsx - Component has wrong hook usage")
    print("3. pending-reviews-list.tsx - Database type issue")

if __name__ == "__main__":
    main()