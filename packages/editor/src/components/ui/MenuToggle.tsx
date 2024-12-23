'use client';

import { useState, useEffect } from 'react';
import {
  MoreVertical,
  Edit3,
  FileDown,
  ScalingIcon as FontSize,
  LineChart,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MenuToggle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-muted"
        >
          <MoreVertical className="h-5 w-5" />
          <span className="sr-only">More options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Edit3 className="mr-2 h-4 w-4" />
          <span>Rename</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileDown className="mr-2 h-4 w-4" />
          <span>Export</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FontSize className="mr-2 h-4 w-4" />
          <span>Choose Font</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LineChart className="mr-2 h-4 w-4" />
          <span>Check Analytics</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
