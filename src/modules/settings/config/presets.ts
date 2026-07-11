import { NavPreference } from '@/modules/core/ui/navigation'

export type WorkflowPreset = {
  id: string
  name: string
  description: string
  icon: string
  navPreferences: NavPreference[]
  pipelineStages: string[]
}

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: 'developer',
    name: 'Developer / Agency',
    description: 'Optimized for software development, with focus on backlog, coding, and testing.',
    icon: '💻',
    navPreferences: [
      { href: '/dashboard', visible: true },
      { href: '/dashboard/projects', visible: true },
      { href: '/dashboard/pipeline', visible: true },
      { href: '/dashboard/clients', visible: true },
      { href: '/dashboard/financials', visible: true },
      { href: '/dashboard/feedback', visible: true },
      { href: '/dashboard/archive', visible: true },
      // Hidden items
      { href: '/dashboard/prodp', visible: false },
      { href: '/dashboard/analytics', visible: true },
      { href: '/dashboard/assets', visible: false },
    ],
    pipelineStages: ['Backlog', 'To Do', 'In Progress', 'Code Review', 'Testing', 'Deployed'],
  },
  {
    id: 'video-editor',
    name: 'Video Editor / Creator',
    description: 'Perfect for post-production workflows, including assembly, VFX, and client reviews.',
    icon: '🎬',
    navPreferences: [
      { href: '/dashboard', visible: true },
      { href: '/dashboard/projects', visible: true },
      { href: '/dashboard/prodp', visible: true },
      { href: '/dashboard/pipeline', visible: true },
      { href: '/dashboard/assets', visible: true },
      { href: '/dashboard/clients', visible: true },
      { href: '/dashboard/financials', visible: true },
      { href: '/dashboard/feedback', visible: true },
      { href: '/dashboard/archive', visible: true },
      // Hidden items
      { href: '/dashboard/analytics', visible: true },
    ],
    pipelineStages: ['Ingestion', 'Assembly', 'Rough Cut', 'VFX & Color', 'Sound Design', 'Client Review', 'Final Render'],
  },
  {
    id: 'writer',
    name: 'Writer / Copywriter',
    description: 'Streamlined for drafting, editing, and publishing written content.',
    icon: '✍️',
    navPreferences: [
      { href: '/dashboard', visible: true },
      { href: '/dashboard/projects', visible: true },
      { href: '/dashboard/pipeline', visible: true },
      { href: '/dashboard/clients', visible: true },
      { href: '/dashboard/financials', visible: true },
      { href: '/dashboard/feedback', visible: true },
      { href: '/dashboard/archive', visible: true },
      // Hidden items
      { href: '/dashboard/prodp', visible: false },
      { href: '/dashboard/analytics', visible: true },
      { href: '/dashboard/assets', visible: false },
    ],
    pipelineStages: ['Ideation', 'Outline', 'First Draft', 'Self-Edit', 'Client Review', 'Final Revisions', 'Published'],
  },
  {
    id: 'production-manager',
    name: 'Production Manager',
    description: 'Built for managing large shoots, casting, and overall production pipelines.',
    icon: '🎥',
    navPreferences: [
      { href: '/dashboard', visible: true },
      { href: '/dashboard/pipeline', visible: true },
      { href: '/dashboard/projects', visible: true },
      { href: '/dashboard/clients', visible: true },
      { href: '/dashboard/financials', visible: true },
      { href: '/dashboard/analytics', visible: true },
      { href: '/dashboard/archive', visible: true },
      // Hidden items
      { href: '/dashboard/prodp', visible: false },
      { href: '/dashboard/assets', visible: false },
      { href: '/dashboard/feedback', visible: false },
    ],
    pipelineStages: ['Pre-Production', 'Casting/Scouting', 'Production', 'Post-Production', 'Final Delivery'],
  },
  {
    id: 'business-owner',
    name: 'Business Owner / Sales',
    description: 'Focuses heavily on leads, financials, reports, and active contract negotiations.',
    icon: '🏢',
    navPreferences: [
      { href: '/dashboard', visible: true },
      { href: '/dashboard/financials', visible: true },
      { href: '/dashboard/analytics', visible: true },
      { href: '/dashboard/clients', visible: true },
      { href: '/dashboard/pipeline', visible: true },
      { href: '/dashboard/projects', visible: true },
      { href: '/dashboard/archive', visible: true },
      // Hidden items
      { href: '/dashboard/prodp', visible: false },
      { href: '/dashboard/assets', visible: false },
      { href: '/dashboard/feedback', visible: false },
    ],
    pipelineStages: ['Lead', 'Negotiation', 'Contract Sent', 'Active', 'Invoiced', 'Paid'],
  },
  {
    id: 'graphic-designer',
    name: 'Graphic Designer / Illustrator',
    description: 'Tailored for visual design with focus on moodboarding, sketching, and final vector delivery.',
    icon: '🎨',
    navPreferences: [
      { href: '/dashboard', visible: true },
      { href: '/dashboard/projects', visible: true },
      { href: '/dashboard/pipeline', visible: true },
      { href: '/dashboard/assets', visible: true },
      { href: '/dashboard/feedback', visible: true },
      { href: '/dashboard/clients', visible: true },
      { href: '/dashboard/financials', visible: true },
      { href: '/dashboard/archive', visible: true },
      // Hidden items
      { href: '/dashboard/prodp', visible: false },
      { href: '/dashboard/analytics', visible: true },
    ],
    pipelineStages: ['Moodboard', 'Sketch / Concept', 'Vectoring / Rendering', 'Color & Polish', 'Client Review', 'Final Delivery'],
  },
  {
    id: 'audio-engineer',
    name: 'Audio Engineer / Producer',
    description: 'Optimized for music and podcast production, spanning recording to final master.',
    icon: '🎧',
    navPreferences: [
      { href: '/dashboard', visible: true },
      { href: '/dashboard/projects', visible: true },
      { href: '/dashboard/pipeline', visible: true },
      { href: '/dashboard/assets', visible: true },
      { href: '/dashboard/clients', visible: true },
      { href: '/dashboard/financials', visible: true },
      { href: '/dashboard/archive', visible: true },
      // Hidden items
      { href: '/dashboard/prodp', visible: false },
      { href: '/dashboard/analytics', visible: true },
      { href: '/dashboard/feedback', visible: false },
    ],
    pipelineStages: ['Composition / Prep', 'Tracking / Recording', 'Editing', 'Mixing', 'Client Feedback', 'Mastering'],
  },
  {
    id: 'uiux-designer',
    name: 'UI/UX Designer',
    description: 'Perfect for product design teams managing research, wireframes, and developer handoffs.',
    icon: '✨',
    navPreferences: [
      { href: '/dashboard', visible: true },
      { href: '/dashboard/projects', visible: true },
      { href: '/dashboard/pipeline', visible: true },
      { href: '/dashboard/feedback', visible: true },
      { href: '/dashboard/clients', visible: true },
      { href: '/dashboard/financials', visible: true },
      { href: '/dashboard/archive', visible: true },
      // Hidden items
      { href: '/dashboard/prodp', visible: false },
      { href: '/dashboard/analytics', visible: true },
      { href: '/dashboard/assets', visible: false },
    ],
    pipelineStages: ['Discovery / Research', 'Wireframes', 'High-Fidelity', 'Prototyping', 'Usability Testing', 'Dev Handoff'],
  },
  {
    id: 'photographer',
    name: 'Photographer',
    description: 'Streamlined for photoshoots, culling, retouching, and sending final client galleries.',
    icon: '📸',
    navPreferences: [
      { href: '/dashboard', visible: true },
      { href: '/dashboard/pipeline', visible: true },
      { href: '/dashboard/projects', visible: true },
      { href: '/dashboard/assets', visible: true },
      { href: '/dashboard/clients', visible: true },
      { href: '/dashboard/financials', visible: true },
      { href: '/dashboard/archive', visible: true },
      // Hidden items
      { href: '/dashboard/prodp', visible: false },
      { href: '/dashboard/analytics', visible: true },
      { href: '/dashboard/feedback', visible: false },
    ],
    pipelineStages: ['Pre-Shoot Planning', 'Shoot Day', 'Culling', 'Color Correction', 'Retouching', 'Gallery Delivery'],
  },
]
