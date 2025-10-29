"""
CSV Upload Service - Single responsibility for entire CSV upload pipeline
Handles: Parse → Map → Validate → Transform → Store

This replaces scattered logic across frontend/backend with one clean service.
"""

import csv
import hashlib
import traceback
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from io import StringIO
from dataclasses import dataclass, asdict

from utils.flexible_column_mapper import FlexibleColumnMapper
from orchestrators.auto_analysis_orchestrator import AutoAnalysisOrchestrator
from supabase import create_client, Client
import os


@dataclass
class ParsedCsv:
    """Result of CSV parsing"""
    headers: List[str]
    rows: List[Dict[str, str]]
    row_count: int
    delimiter: str


@dataclass
class ValidationResult:
    """Result of data validation"""
    valid: bool
    error_message: Optional[str] = None
    suggestions: List[str] = None
    
    def __post_init__(self):
        if self.suggestions is None:
            self.suggestions = []


@dataclass
class UploadResult:
    """Final result of upload process"""
    success: bool
    rows_inserted: int = 0
    facility_id: Optional[int] = None
    demo_mode: bool = False
    batch_id: Optional[str] = None
    mapping_used: Optional[Dict[str, str]] = None
    confidence: float = 0.0
    error: Optional[str] = None
    technical_details: Optional[str] = None
    auto_analysis: Optional[Dict] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON response"""
        result = asdict(self)
        # Remove None values to keep response clean
        return {k: v for k, v in result.items() if v is not None}


class CsvUploadService:
    """Single service handling entire CSV upload pipeline"""
    
    def __init__(self):
        self.mapper = FlexibleColumnMapper()
        self.orchestrator = AutoAnalysisOrchestrator()
        
        # Initialize Supabase client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
    
    def process_upload(
        self, 
        file_content: str, 
        user_email: str, 
        filename: str,
        confirmed_mapping: Optional[Dict[str, str]] = None
    ) -> UploadResult:
        """
        Main entry point - handles everything from CSV to Supabase
        
        Args:
            file_content: Raw CSV file content as string
            user_email: User's email for facility/demo detection
            filename: Original filename for tracking
            confirmed_mapping: Optional user-confirmed mapping override
            
        Returns:
            UploadResult with clear success/error states
        """
        try:
            # Determine facility and demo mode
            is_demo = self._is_demo_account(user_email)
            facility_id = 1 if is_demo else 2  # Demo=1, Real=2
            
            # Step 1: Parse CSV
            parsed = self._parse_csv(file_content)
            
            # Step 2: Generate or use mapping
            if confirmed_mapping:
                mapping_result = {'mapping': confirmed_mapping}
            else:
                mapping_result = self.mapper.map_columns(parsed.headers)
            
            # Step 3: Validate
            validation = self._validate(mapping_result, parsed.rows)
            if not validation.valid:
                return UploadResult(
                    success=False,
                    error=validation.error_message,
                    facility_id=facility_id,
                    demo_mode=is_demo
                )
            
            # Step 4: Transform data
            transformed = self._transform_data(
                parsed.rows,
                mapping_result['mapping'],
                facility_id,
                is_demo,
                filename
            )
            
            # Step 5: Store in Supabase
            batch_id = f"{int(datetime.now().timestamp())}_{filename}"
            store_result = self._store_data(
                transformed,
                user_email,
                filename,
                mapping_result['mapping'],
                batch_id
            )
            
            if not store_result['success']:
                return UploadResult(
                    success=False,
                    error=store_result['error'],
                    facility_id=facility_id,
                    demo_mode=is_demo,
                    batch_id=batch_id
                )
            
            # Step 6: Run auto-analysis
            auto_analysis = self.orchestrator.analyze(
                facility_id=facility_id,
                batch_id=batch_id,
                csv_headers=parsed.headers,
                config=None  # Will use facility defaults
            )
            
            # Success!
            confidence = len(mapping_result['mapping']) / len(self.mapper.column_patterns) * 100
            
            return UploadResult(
                success=True,
                rows_inserted=len(transformed),
                facility_id=facility_id,
                demo_mode=is_demo,
                batch_id=batch_id,
                mapping_used=mapping_result['mapping'],
                confidence=round(confidence, 1),
                auto_analysis=auto_analysis
            )
            
        except Exception as e:
            # All errors bubble up with context
            return UploadResult(
                success=False,
                error=f"Upload failed: {str(e)}",
                technical_details=traceback.format_exc()
            )
    
    def get_mapping_suggestions(
        self, 
        file_content: str
    ) -> Dict:
        """
        Get mapping suggestions without uploading data
        Used for showing user the mapping modal
        
        Args:
            file_content: Raw CSV file content
            
        Returns:
            Mapping report with suggestions
        """
        try:
            parsed = self._parse_csv(file_content)
            report = self.mapper.generate_mapping_report(parsed.headers)
            
            return {
                'success': True,
                'headers': parsed.headers,
                'sample_rows': parsed.rows[:5],  # First 5 for preview
                'mapping_suggestions': report['mapped_columns'],
                'unmapped_columns': report['unmapped_csv_columns'],
                'missing_required': report['missing_required'],
                'confidence': round(report['confidence'], 1),
                'message': report['message']
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to analyze CSV: {str(e)}"
            }
    
    def _parse_csv(self, content: str) -> ParsedCsv:
        """
        Parse CSV with automatic delimiter detection
        
        Args:
            content: Raw CSV content as string
            
        Returns:
            ParsedCsv with headers and rows
            
        Raises:
            ValueError: If CSV is empty or invalid
        """
        if not content or not content.strip():
            raise ValueError("CSV file is empty")
        
        # Detect delimiter
        sniffer = csv.Sniffer()
        try:
            sample = content[:1024]  # First 1KB for detection
            delimiter = sniffer.sniff(sample).delimiter
        except:
            # Fallback to comma
            delimiter = ','
        
        # Parse CSV
        csv_reader = csv.DictReader(StringIO(content), delimiter=delimiter)
        
        try:
            rows = list(csv_reader)
        except Exception as e:
            raise ValueError(f"Invalid CSV format: {str(e)}")
        
        if not rows:
            raise ValueError("CSV has no data rows")
        
        headers = list(rows[0].keys())
        
        return ParsedCsv(
            headers=headers,
            rows=rows,
            row_count=len(rows),
            delimiter=delimiter
        )
    
    def _validate(
        self, 
        mapping_result: Dict, 
        rows: List[Dict]
    ) -> ValidationResult:
        """
        Centralized validation logic
        
        Args:
            mapping_result: Result from column mapper
            rows: Parsed CSV rows
            
        Returns:
            ValidationResult with pass/fail and suggestions
        """
        mapping = mapping_result.get('mapping', {})
        missing = mapping_result.get('missing_required_fields', [])
        
        # Check required fields
        if missing:
            suggestions = []
            for field in missing:
                examples = self.mapper.column_patterns.get(field, [])[:3]
                suggestions.append(
                    f"Add '{field}' column (examples: {', '.join(examples)})"
                )
            
            return ValidationResult(
                valid=False,
                error_message=f"Missing required fields: {', '.join(missing)}",
                suggestions=suggestions
            )
        
        # Check data quality on first few rows
        sample_size = min(10, len(rows))
        for i, row in enumerate(rows[:sample_size], 1):
            # Check numeric fields
            for field in ['planned_material_cost', 'actual_material_cost', 
                         'planned_labor_hours', 'actual_labor_hours']:
                if field in mapping:
                    csv_col = mapping[field]
                    value = row.get(csv_col, '')
                    
                    if value and not self._is_numeric(value):
                        return ValidationResult(
                            valid=False,
                            error_message=f"Row {i}: '{field}' must be numeric (got '{value}')",
                            suggestions=[f"Ensure '{csv_col}' contains only numbers"]
                        )
        
        return ValidationResult(valid=True)
    
    def _transform_data(
        self,
        rows: List[Dict],
        mapping: Dict[str, str],
        facility_id: int,
        demo_mode: bool,
        filename: str
    ) -> List[Dict]:
        """
        Transform CSV data to Supabase schema
        
        Args:
            rows: Parsed CSV rows
            mapping: Column mapping
            facility_id: Facility ID
            demo_mode: Whether this is demo data
            filename: Original filename for batch tracking
            
        Returns:
            List of dictionaries ready for Supabase insertion
        """
        transformed = []
        batch_id = f"{int(datetime.now().timestamp())}_{filename}"
        
        for i, row in enumerate(rows, 1):
            work_order = {
                'facility_id': facility_id,
                'demo_mode': demo_mode,
                'uploaded_csv_batch': batch_id,
                'work_order_number': f"UPLOAD-{batch_id}-{i}"  # Default
            }
            
            # Map each field
            for supabase_col, csv_col in mapping.items():
                value = row.get(csv_col, '').strip()
                
                if not value:  # Skip empty values
                    continue
                
                # Handle work_order_number specially
                if supabase_col == 'work_order_number':
                    work_order['work_order_number'] = str(value)
                
                # Convert numeric fields
                elif any(term in supabase_col for term in ['cost', 'hours', 'quantity', 'scrapped']):
                    work_order[supabase_col] = self._parse_number(value)
                
                # Convert date fields
                elif 'date' in supabase_col or 'period' in supabase_col:
                    parsed_date = self._parse_date(value)
                    if parsed_date:
                        work_order[supabase_col] = parsed_date
                
                # String fields
                else:
                    work_order[supabase_col] = str(value)
            
            transformed.append(work_order)
        
        return transformed
    
    def _store_data(
        self,
        data: List[Dict],
        user_email: str,
        filename: str,
        mapping: Dict[str, str],
        batch_id: str
    ) -> Dict:
        """
        Store data in Supabase with proper error handling
        
        Args:
            data: Transformed work order data
            user_email: User's email
            filename: Original filename
            mapping: Column mapping used
            batch_id: Batch identifier
            
        Returns:
            Dictionary with success status and details
        """
        try:
            # Insert work orders
            response = self.supabase.table('work_orders').insert(data).execute()
            
            if hasattr(response, 'error') and response.error:
                return {
                    'success': False,
                    'error': f"Database error: {response.error}"
                }
            
            # Save mapping for reuse
            self._save_mapping(user_email, filename, mapping, data[0]['facility_id'])
            
            return {
                'success': True,
                'rows_inserted': len(data)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Storage failed: {str(e)}"
            }
    
    def _save_mapping(
        self,
        user_email: str,
        filename: str,
        mapping: Dict[str, str],
        facility_id: int
    ):
        """Save mapping configuration for future use"""
        try:
            # Create header signature for matching
            header_signature = self._generate_header_signature(list(mapping.values()))
            
            # Check if mapping exists
            existing = self.supabase.table('csv_mappings')\
                .select('id')\
                .eq('user_email', user_email)\
                .eq('header_signature', header_signature)\
                .execute()
            
            mapping_data = {
                'user_email': user_email,
                'facility_id': facility_id,
                'file_name': filename,
                'mapping_config': mapping,
                'header_signature': header_signature,
                'created_at': datetime.now().isoformat()
            }
            
            if existing.data:
                # Update existing
                self.supabase.table('csv_mappings')\
                    .update(mapping_data)\
                    .eq('id', existing.data[0]['id'])\
                    .execute()
            else:
                # Insert new
                self.supabase.table('csv_mappings')\
                    .insert(mapping_data)\
                    .execute()
                    
        except Exception as e:
            # Don't fail upload if mapping save fails
            print(f"Warning: Could not save mapping: {str(e)}")
    
    def _generate_header_signature(self, headers: List[str]) -> str:
        """Generate unique signature for CSV headers"""
        sorted_headers = sorted([h.lower().strip() for h in headers])
        signature_string = '|'.join(sorted_headers)
        return hashlib.md5(signature_string.encode()).hexdigest()
    
    def _is_demo_account(self, email: str) -> bool:
        """Check if email is demo account"""
        demo_emails = ['skinner.chris@gmail.com', 'demo@example.com']
        return email.lower() in demo_emails
    
    def _is_numeric(self, value: str) -> bool:
        """Check if string can be converted to number"""
        try:
            # Remove common formatting
            clean = value.replace(',', '').replace('$', '').strip()
            float(clean)
            return True
        except:
            return False
    
    def _parse_number(self, value: str, default: float = 0.0) -> float:
        """Parse string to number with formatting removal"""
        try:
            clean = value.replace(',', '').replace('$', '').strip()
            return float(clean)
        except:
            return default
    
    def _parse_date(self, value: str) -> Optional[str]:
        """Parse date string to ISO format"""
        if not value:
            return None
        
        try:
            date = datetime.fromisoformat(value)
            return date.isoformat()
        except:
            try:
                # Try common formats
                from dateutil import parser
                date = parser.parse(value)
                return date.isoformat()
            except:
                return None


# Example usage
if __name__ == "__main__":
    # Test with sample CSV
    sample_csv = """Work Order Number,Material Code,Planned Material Cost,Actual Material Cost,Planned Labor Hours,Actual Labor Hours
WO-001,MAT-100,1000,1100,10,12
WO-002,MAT-200,2000,1900,15,14"""
    
    service = CsvUploadService()
    result = service.process_upload(
        file_content=sample_csv,
        user_email='test@example.com',
        filename='test.csv'
    )
    
    print("Upload Result:")
    print(result.to_dict())