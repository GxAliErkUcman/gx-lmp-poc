import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ValidationError } from '@/lib/validation';

interface ValidationErrorsProps {
  errors: ValidationError[];
  className?: string;
}

export const ValidationErrors = ({ errors, className = "" }: ValidationErrorsProps) => {
  if (errors.length === 0) {
    return (
      <Alert className={`border-green-200 bg-green-50 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          All fields are valid! Ready for export.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Found {errors.length} validation error{errors.length !== 1 ? 's' : ''}. Please fix these issues before exporting:
        </AlertDescription>
      </Alert>
      
      <div className="space-y-2">
        {errors.map((error, index) => (
          <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Badge variant="destructive" className="mt-0.5">
                {error.field}
              </Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error.message}</p>
                {error.suggestion && (
                  <div className="mt-1 flex items-start gap-1">
                    <Info className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">{error.suggestion}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};