"""
Query Classifier - Determines what type of question the user is asking
"""

class QueryClassifier:
    """Classifies user queries into different types for appropriate routing"""
    
    def __init__(self):
        # Data query patterns - asking for specific metrics
        self.data_query_patterns = [
            'what is', 'what was', 'what are', 'show me',
            'how much', 'how many', 'tell me about',
            'calculate', 'average', 'total', 'sum',
            'labor rate', 'cost per', 'scrap rate',
            'efficiency rate', 'downtime', 'variance'
        ]
        
        # Scenario patterns - what-if questions
        self.scenario_patterns = [
            'what if', 'if we', 'suppose', 'assuming',
            'add a shift', 'reduce scrap', 'improve',
            'increase capacity', 'change', 'optimize'
        ]
        
        # Data retrieval patterns - asking for lists/details
        self.retrieval_patterns = [
            'show', 'list', 'display', 'give me',
            'orders for', 'all', 'find', 'search',
            'which', 'where'
        ]
        
    def classify(self, query: str) -> dict:
        """
        Classify the query type
        
        Returns:
            {
                'type': 'data_query' | 'scenario' | 'retrieval' | 'analysis',
                'confidence': float,
                'subtype': str (optional)
            }
        """
        query_lower = query.lower()
        
        # Check for scenario modeling (highest priority)
        if any(pattern in query_lower for pattern in self.scenario_patterns):
            return {
                'type': 'scenario',
                'confidence': 0.9,
                'subtype': self._detect_scenario_type(query_lower)
            }
        
        # Check for data queries (metrics/calculations)
        if any(pattern in query_lower for pattern in self.data_query_patterns):
            return {
                'type': 'data_query',
                'confidence': 0.85,
                'subtype': self._detect_metric_type(query_lower)
            }
        
        # Check for data retrieval (lists/details)
        if any(pattern in query_lower for pattern in self.retrieval_patterns):
            return {
                'type': 'retrieval',
                'confidence': 0.8,
                'subtype': 'work_orders'
            }
        
        # Default to analysis (existing behavior)
        return {
            'type': 'analysis',
            'confidence': 0.5,
            'subtype': None
        }
    
    def _detect_scenario_type(self, query: str) -> str:
        """Detect specific scenario type"""
        if 'shift' in query:
            return 'shift_addition'
        elif 'scrap' in query or 'quality' in query:
            return 'quality_improvement'
        elif 'capacity' in query or 'production' in query:
            return 'capacity_change'
        elif 'cost' in query or 'reduce' in query:
            return 'cost_reduction'
        return 'general'
    
    def _detect_metric_type(self, query: str) -> str:
        """Detect specific metric being asked about"""
        if 'labor rate' in query or 'hourly rate' in query:
            return 'labor_rate'
        elif 'scrap rate' in query:
            return 'scrap_rate'
        elif 'efficiency' in query:
            return 'efficiency_rate'
        elif 'cost' in query:
            return 'cost_metric'
        elif 'variance' in query:
            return 'variance_metric'
        return 'general_metric'