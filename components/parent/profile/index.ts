// components/parent/profile/index.ts
// Barrel exports for parent profile components
// Most components reused from helper/profile

export { ChildrenList } from './ChildrenList';
export { DocumentsCard } from './DocumentsCard';
export { DocumentViewer } from './DocumentViewer';
export { ElderlyList } from './ElderlyList';
export { MobileProfileHeader } from './MobileProfileHeader';
export { ProfileHeader } from './ProfileHeader';

// These components are imported from helper/profile:
// - ProfileHeader (same, just different color)
// - MobileProfileHeader (same, just different color)
// - InfoCard (reusable!)
// - DocumentsCard (reusable!)
// - DocumentViewer (same)
