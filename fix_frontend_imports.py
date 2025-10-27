#!/usr/bin/env python3
"""
Frontend Import Fixer for plant-intel-mvp
Updates imports after lib/ folder reorganization
"""

import os
import sys
import re

def replace_in_file(filepath, replacements):
    """Replace import statements in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes_made = 0
        
        for old_import, new_import in replacements:
            if old_import in content:
                content = content.replace(old_import, new_import)
                changes_made += 1
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes_made
        return 0
    except Exception as e:
        print(f"   ERROR: {e}")
        return 0

def find_ts_files(src_dir):
    """Find all TypeScript/TSX files"""
    ts_files = []
    for root, dirs, files in os.walk(src_dir):
        # Skip node_modules
        if 'node_modules' in root:
            continue
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                ts_files.append(os.path.join(root, file))
    return ts_files

def main():
    # Get the project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check if we're in the project root
    src_dir = os.path.join(script_dir, 'src')
    if not os.path.exists(src_dir):
        print("ERROR: Cannot find src/ directory")
        print("Please run this script from the plant-intel-mvp root directory")
        sys.exit(1)
    
    print("Fixing frontend imports in src/ files...")
    print()
    
    # Define import replacements
    replacements = [
        # CSV imports
        ('from "@/lib/csvMapper"', 'from "@/lib/csv/csvMapper"'),
        ("from '@/lib/csvMapper'", "from '@/lib/csv/csvMapper'"),
        ('from "@/lib/csv-storage"', 'from "@/lib/csv/csv-storage"'),
        ("from '@/lib/csv-storage'", "from '@/lib/csv/csv-storage'"),
        ('from "@/lib/file-hash"', 'from "@/lib/csv/file-hash"'),
        ("from '@/lib/file-hash'", "from '@/lib/csv/file-hash'"),
        
        # CRM imports
        ('from "@/lib/demo-account"', 'from "@/lib/crm/demo-account"'),
        ("from '@/lib/demo-account'", "from '@/lib/crm/demo-account'"),
        ('from "@/lib/customer-profiles"', 'from "@/lib/crm/customer-profiles"'),
        ("from '@/lib/customer-profiles'", "from '@/lib/crm/customer-profiles'"),
        
        # AI imports
        ('from "@/lib/format-ml-response"', 'from "@/lib/ai/format-ml-response"'),
        ("from '@/lib/format-ml-response'", "from '@/lib/ai/format-ml-response'"),
        ('from "@/lib/aiService"', 'from "@/lib/ai/aiService"'),
        ("from '@/lib/aiService'", "from '@/lib/ai/aiService'"),
        
        # Analytics imports
        ('from "@/lib/manufacturingIntelligence"', 'from "@/lib/analytics/manufacturingIntelligence"'),
        ("from '@/lib/manufacturingIntelligence'", "from '@/lib/analytics/manufacturingIntelligence'"),
        ('from "@/lib/insight-types"', 'from "@/lib/analytics/insight-types"'),
        ("from '@/lib/insight-types'", "from '@/lib/analytics/insight-types'"),
        ('from "@/lib/insight-icons"', 'from "@/lib/analytics/insight-icons"'),
        ("from '@/lib/insight-icons'", "from '@/lib/analytics/insight-icons'"),
        ('from "@/lib/analysis-reviews"', 'from "@/lib/analytics/analysis-reviews"'),
        ("from '@/lib/analysis-reviews'", "from '@/lib/analytics/analysis-reviews'"),
        ('from "@/lib/roi-tracking"', 'from "@/lib/analytics/roi-tracking"'),
        ("from '@/lib/roi-tracking'", "from '@/lib/analytics/roi-tracking'"),
        
        # Utils imports (move field-options)
        ('from "@/lib/field-options"', 'from "@/lib/utils/field-options"'),
        ("from '@/lib/field-options'", "from '@/lib/utils/field-options'"),
    ]
    
    # Find all TypeScript files
    ts_files = find_ts_files(src_dir)
    
    print(f"Found {len(ts_files)} TypeScript files to check")
    print()
    
    total_changes = 0
    files_modified = 0
    
    for filepath in ts_files:
        relative_path = os.path.relpath(filepath, script_dir)
        changes = replace_in_file(filepath, replacements)
        
        if changes > 0:
            print(f"  {relative_path}: Fixed {changes} import(s)")
            total_changes += changes
            files_modified += 1
    
    print()
    print(f"Complete! Fixed {total_changes} import(s) in {files_modified} file(s)")
    print()
    print("Next steps:")
    print("1. Download csv-storage.ts and place it in src/lib/csv/")
    print("2. Test your frontend:")
    print("   npm run dev")
    print()
    print("3. Check what changed:")
    print("   git status")
    print("   git diff")

if __name__ == "__main__":
    main()