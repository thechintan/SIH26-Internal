import React from 'react';
import {
  AlertTriangle,
  Lightbulb,
  Trash2,
  Droplets,
  Waves,
  Dog,
  HelpCircle,
  LucideProps,
} from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  category: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, ...props }) => {
  switch (category?.toLowerCase()) {
    case 'pothole':
      return <AlertTriangle {...props} />;
    case 'streetlight':
      return <Lightbulb {...props} />;
    case 'garbage':
      return <Trash2 {...props} />;
    case 'water_leakage':
      return <Droplets {...props} />;
    case 'drainage':
      return <Waves {...props} />;
    case 'stray_animal':
      return <Dog {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
};
