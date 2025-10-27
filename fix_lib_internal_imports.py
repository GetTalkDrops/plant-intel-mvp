#!/usr/bin/env python3
"""
Fix relative imports within src/lib/ subfolders
Files in lib/analytics/, lib/ai/, lib/crm/, etc. need to import from parent directory
"""

import os
import sys

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

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    lib_dir = os.path.join(script_dir, 'src', 'lib')
    
    if not os.path.exists(lib_dir):
        print("ERROR: Cannot find src/lib/ directory")
        sys.exit(1)
    
    print("Fixing relative imports within lib/ subfolders...")
    print()
    
    # Fix imports in analytics/ folder
    analytics_dir = os.path.join(lib_dir, 'analytics')
    analytics_replacements = [
        ('from "./supabase"', 'from "../supabase"'),
        ("from './supabase'", "from '../supabase'"),
        ('from "./aiService"', 'from "../ai/aiService"'),
        ("from './aiService'", "from '../ai/aiService'"),
        ('from "./format-ml-response"', 'from "../ai/format-ml-response"'),
        ("from './format-ml-response'", "from '../ai/format-ml-response'"),
        ('from "./insight-types"', 'from "./insight-types"'),  # Same folder - keep as is
    ]
    
    # Fix imports in crm/ folder
    crm_dir = os.path.join(lib_dir, 'crm')
    crm_replacements = [
        ('from "./supabase"', 'from "../supabase"'),
        ("from './supabase'", "from '../supabase'"),
    ]
    
    # Fix imports in ai/ folder
    ai_dir = os.path.join(lib_dir, 'ai')
    ai_replacements = [
        ('from "./insight-types"', 'from "../analytics/insight-types"'),
        ("from './insight-types'", "from '../analytics/insight-types'"),
    ]
    
    # Fix imports in utils/ folder
    utils_dir = os.path.join(lib_dir, 'utils')
    utils_replacements = [
        ('from "@/lib/insight-types"', 'from "@/lib/analytics/insight-types"'),
        ("from '@/lib/insight-types'", "from '@/lib/analytics/insight-types'"),
    ]
    
    total_changes = 0
    
    # Process analytics files
    if os.path.exists(analytics_dir):
        print("Processing analytics/ files...")
        for filename in os.listdir(analytics_dir):
            if filename.endswith('.ts') or filename.endswith('.tsx'):
                filepath = os.path.join(analytics_dir, filename)
                changes = replace_in_file(filepath, analytics_replacements)
                if changes > 0:
                    print(f"  {filename}: Fixed {changes} import(s)")
                    total_changes += changes
    
    # Process crm files
    if os.path.exists(crm_dir):
        print("Processing crm/ files...")
        for filename in os.listdir(crm_dir):
            if filename.endswith('.ts') or filename.endswith('.tsx'):
                filepath = os.path.join(crm_dir, filename)
                changes = replace_in_file(filepath, crm_replacements)
                if changes > 0:
                    print(f"  {filename}: Fixed {changes} import(s)")
                    total_changes += changes
    
    # Process ai files
    if os.path.exists(ai_dir):
        print("Processing ai/ files...")
        for filename in os.listdir(ai_dir):
            if filename.endswith('.ts') or filename.endswith('.tsx'):
                filepath = os.path.join(ai_dir, filename)
                changes = replace_in_file(filepath, ai_replacements)
                if changes > 0:
                    print(f"  {filename}: Fixed {changes} import(s)")
                    total_changes += changes
    
    # Process utils files
    if os.path.exists(utils_dir):
        print("Processing utils/ files...")
        for filename in os.listdir(utils_dir):
            if filename.endswith('.ts') or filename.endswith('.tsx'):
                filepath = os.path.join(utils_dir, filename)
                changes = replace_in_file(filepath, utils_replacements)
                if changes > 0:
                    print(f"  {filename}: Fixed {changes} import(s)")
                    total_changes += changes
    
    print()
    print(f"Complete! Fixed {total_changes} relative import(s)")
    print()
    print("Now run the first script again to catch any remaining imports:")
    print("  python3 fix_frontend_imports.py")
    print()
    print("Then test:")
    print("  npx tsc --noEmit")

if __name__ == "__main__":
    main()