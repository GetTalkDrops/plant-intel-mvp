"""
Analytics module for Plant Intel
Provides baseline tracking, trend detection, degradation detection, and correlation analysis
"""

from .baseline_tracker import BaselineTracker
from .trend_detector import TrendDetector
from .degradation_detector import DegradationDetector
from .correlation_analyzer import CorrelationAnalyzer

__all__ = [
    'BaselineTracker',
    'TrendDetector', 
    'DegradationDetector',
    'CorrelationAnalyzer'
]
