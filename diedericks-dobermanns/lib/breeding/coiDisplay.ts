import type { CoiSeverity } from '@/lib/breeding/coi';

export function coiSeverityLabel(severity: CoiSeverity): string {
  switch (severity) {
    case 'excellent':
      return 'Excellent';
    case 'acceptable':
      return 'Acceptable';
    case 'caution':
      return 'Caution';
    case 'risk':
      return 'Risk';
    case 'high_risk':
      return 'High Risk';
  }
}

export function coiBadgeClasses(severity: CoiSeverity): { container: string; text: string } {
  switch (severity) {
    case 'excellent':
      return { container: 'bg-success/10 border-success/40', text: 'text-success' };
    case 'acceptable':
      return { container: 'bg-gold/10 border-gold/40', text: 'text-gold' };
    case 'caution':
      return { container: 'bg-gold/10 border-gold/30', text: 'text-gold' };
    case 'risk':
      return { container: 'bg-danger/10 border-danger/40', text: 'text-danger' };
    case 'high_risk':
      return { container: 'bg-danger/10 border-2 border-danger', text: 'text-danger' };
  }
}
