export type IdeaStatus = 'new' | 'reviewed' | 'implemented';

export interface Idea {
  id: string;
  author: string;
  title: string;
  description: string;
  status: IdeaStatus;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  projectUrl: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
}

export type TabType = 'ideas' | 'projects' | 'gallery';
