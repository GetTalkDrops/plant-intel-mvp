from difflib import SequenceMatcher
import re
from typing import List, Tuple

class QueryPreprocessor:
    def __init__(self):
        # Common manufacturing term corrections
        self.spelling_corrections = {
            'equiptment': 'equipment',
            'equipement': 'equipment', 
            'maintanence': 'maintenance',
            'maintenence': 'maintenance',
            'preform': 'perform',
            'preforms': 'performs',
            'wich': 'which',
            'waht': 'what',
            'eficiency': 'efficiency',
            'efficency': 'efficiency',
            'qualty': 'quality',
            'qualiy': 'quality',
            'analize': 'analyze',
            'anlysis': 'analysis'
        }
        
        # Keyword groups with synonyms and common misspellings
        self.keyword_groups = {
            'equipment': ['equipment', 'equiptment', 'equipement', 'machine', 'machinery', 'asset', 'tool', 'device'],
            'maintenance': ['maintenance', 'maintanence', 'maintenence', 'repair', 'service', 'fix', 'upkeep'],
            'quality': ['quality', 'qualty', 'qualiy', 'defect', 'scrap', 'waste', 'rework', 'reject'],
            'cost': ['cost', 'budget', 'expense', 'money', 'dollar', 'financial', 'price', 'spending'],
            'efficiency': ['efficiency', 'eficiency', 'efficency', 'performance', 'productivity', 'throughput'],
            'shift': ['shift', 'team', 'crew', 'schedule', 'rotation'],
            'plant': ['plant', 'facility', 'factory', 'site', 'location', 'operation'],
            'worker': ['worker', 'employee', 'operator', 'technician', 'staff', 'personnel']
        }
    
    def preprocess_query(self, query: str) -> str:
        """Clean and normalize query for better matching"""
        # Convert to lowercase
        query = query.lower().strip()
        
        # Fix common spelling errors
        words = query.split()
        corrected_words = []
        for word in words:
            # Remove punctuation for matching
            clean_word = re.sub(r'[^\w]', '', word)
            if clean_word in self.spelling_corrections:
                corrected_words.append(self.spelling_corrections[clean_word])
            else:
                corrected_words.append(word)
        
        return ' '.join(corrected_words)
    
    def fuzzy_category_match(self, query: str, threshold: float = 0.8) -> List[str]:
        """Find category matches using fuzzy string matching"""
        query = self.preprocess_query(query)
        matches = []
        
        for category, keywords in self.keyword_groups.items():
            for keyword in keywords:
                # Check for exact matches first
                if keyword in query:
                    matches.append(category)
                    break
                
                # Check fuzzy matches for each word in query
                for word in query.split():
                    clean_word = re.sub(r'[^\w]', '', word)
                    if len(clean_word) > 2:  # Avoid matching very short words
                        similarity = SequenceMatcher(None, clean_word, keyword).ratio()
                        if similarity >= threshold:
                            matches.append(category)
                            break
        
        return list(set(matches))  # Remove duplicates
    
    def suggest_correction(self, query: str) -> Tuple[str, bool]:
        """Suggest corrected query if significant changes made"""
        original = query.lower().strip()
        corrected = self.preprocess_query(query)
        
        # Check if we made significant corrections
        if original != corrected:
            return corrected, True
        return original, False

# Test the preprocessor
if __name__ == "__main__":
    processor = QueryPreprocessor()
    
    test_queries = [
        "waht equiptment needs maintanence",
        "wich shift preforms best", 
        "show me qualty issues",
        "analize labor eficiency"
    ]
    
    for query in test_queries:
        corrected, was_corrected = processor.suggest_correction(query)
        categories = processor.fuzzy_category_match(query)
        print(f"Original: {query}")
        print(f"Corrected: {corrected} (changed: {was_corrected})")
        print(f"Categories: {categories}")
        print("---")
