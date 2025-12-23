/**
 * UI Components Index
 *
 * Centralized exports for all UI enhancement components.
 * Makes imports cleaner throughout the application.
 *
 * Usage:
 * import { EnhancedTaskCard, StatsGrid, FadeIn } from '@/components/ui-enhancements';
 */

// Animation Components
export { FadeIn } from './shared/animations/FadeIn';
export { ScaleIn } from './shared/animations/ScaleIn';
export { SlideIn } from './shared/animations/SlideIn';
export { StaggerList, StaggerItem } from './shared/animations/StaggerList';

// Enhanced Components
export { EnhancedTaskCard } from './task/EnhancedCard';
export { StatCard, StatsGrid } from './shared/StatsCard';
export { EmptyState } from './shared/EmptyState';
export { PageTransition } from './shared/PageTransition';
export { default as EnhancedNavbar } from './shared/EnhancedNavbar';

// Skeleton Loaders
export { TaskCardSkeleton, DashboardSkeleton } from './shared/skeletons';
