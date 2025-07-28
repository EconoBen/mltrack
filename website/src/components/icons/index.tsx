import React from 'react';
import {
  // Navigation
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  
  // Actions
  Search,
  Copy,
  Download,
  Upload,
  Share2,
  Settings,
  MoreVertical,
  MoreHorizontal,
  Plus,
  Minus,
  Check,
  
  // Media
  Play,
  Pause,
  Video,
  Image,
  Camera,
  
  // File types
  FileText,
  FileCode,
  File,
  Folder,
  FolderOpen,
  
  // Communication
  MessageSquare,
  Send,
  Bell,
  Mail,
  
  // Data & Charts
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  
  // Development
  Code,
  Terminal,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Github,
  
  // Status
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  
  // User
  User,
  Users,
  UserPlus,
  LogIn,
  LogOut,
  
  // Time
  Clock,
  Calendar,
  Timer,
  
  // MLTrack specific
  Rocket,
  Zap,
  Shield,
  DollarSign,
  Package,
  Server,
  Cloud,
  Database,
  Layers,
  Box,
  Cpu,
  HardDrive,
  
  // Documentation
  Book,
  BookOpen,
  Bookmark,
  FileQuestion,
  GraduationCap,
  Lightbulb,
  
  // Misc
  Heart,
  Star,
  Flag,
  Tag,
  Hash,
  Link,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

// Icon component wrapper with consistent sizing
interface IconProps {
  name: keyof typeof icons;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

const sizeMap = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40
};

export const icons = {
  // Navigation
  home: Home,
  menu: Menu,
  close: X,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  externalLink: ExternalLink,
  
  // Actions
  search: Search,
  copy: Copy,
  download: Download,
  upload: Upload,
  share: Share2,
  settings: Settings,
  moreVertical: MoreVertical,
  moreHorizontal: MoreHorizontal,
  plus: Plus,
  minus: Minus,
  check: Check,
  
  // Media
  play: Play,
  pause: Pause,
  video: Video,
  image: Image,
  camera: Camera,
  
  // File types
  fileText: FileText,
  fileCode: FileCode,
  file: File,
  folder: Folder,
  folderOpen: FolderOpen,
  
  // Communication
  message: MessageSquare,
  send: Send,
  bell: Bell,
  mail: Mail,
  
  // Data & Charts
  barChart: BarChart3,
  lineChart: LineChart,
  pieChart: PieChart,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  activity: Activity,
  
  // Development
  code: Code,
  terminal: Terminal,
  gitBranch: GitBranch,
  gitCommit: GitCommit,
  gitPullRequest: GitPullRequest,
  github: Github,
  
  // Status
  alertCircle: AlertCircle,
  info: Info,
  checkCircle: CheckCircle,
  xCircle: XCircle,
  warning: AlertTriangle,
  
  // User
  user: User,
  users: Users,
  userPlus: UserPlus,
  logIn: LogIn,
  logOut: LogOut,
  
  // Time
  clock: Clock,
  calendar: Calendar,
  timer: Timer,
  
  // MLTrack specific
  rocket: Rocket,
  zap: Zap,
  shield: Shield,
  dollar: DollarSign,
  package: Package,
  server: Server,
  cloud: Cloud,
  database: Database,
  layers: Layers,
  box: Box,
  cpu: Cpu,
  hardDrive: HardDrive,
  
  // Documentation
  book: Book,
  bookOpen: BookOpen,
  bookmark: Bookmark,
  help: FileQuestion,
  learn: GraduationCap,
  idea: Lightbulb,
  
  // Misc
  heart: Heart,
  star: Star,
  flag: Flag,
  tag: Tag,
  hash: Hash,
  link: Link,
  loader: Loader2,
  refresh: RefreshCw,
  sparkles: Sparkles
};

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 'md', 
  className = '', 
  color = 'currentColor' 
}) => {
  const IconComponent = icons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  return (
    <IconComponent 
      size={sizeMap[size]} 
      className={className}
      color={color}
    />
  );
};

// Export individual icons for direct import
export {
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Search,
  Copy,
  Download,
  Upload,
  Share2,
  Settings,
  MoreVertical,
  MoreHorizontal,
  Plus,
  Minus,
  Check,
  Play,
  Pause,
  Video,
  Image,
  Camera,
  FileText,
  FileCode,
  File,
  Folder,
  FolderOpen,
  MessageSquare,
  Send,
  Bell,
  Mail,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Code,
  Terminal,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Github,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Users,
  UserPlus,
  LogIn,
  LogOut,
  Clock,
  Calendar,
  Timer,
  Rocket,
  Zap,
  Shield,
  DollarSign,
  Package,
  Server,
  Cloud,
  Database,
  Layers,
  Box,
  Cpu,
  HardDrive,
  Book,
  BookOpen,
  Bookmark,
  FileQuestion,
  GraduationCap,
  Lightbulb,
  Heart,
  Star,
  Flag,
  Tag,
  Hash,
  Link,
  Loader2,
  RefreshCw,
  Sparkles
};