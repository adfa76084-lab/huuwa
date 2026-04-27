export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  imageUrl: string | null;
  membersCount: number;
  type?: 'default' | 'user';
  createdBy?: string;
  hashtags?: string[];
}
