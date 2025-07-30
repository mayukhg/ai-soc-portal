import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  incident_id?: string;
  alert_id?: string;
  user_id: string;
  content: string;
  comment_type: 'note' | 'escalation' | 'resolution' | 'question';
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string;
    full_name: string;
    role: string;
  };
}

export function useCollaboration(targetId: string, targetType: 'incident' | 'alert') {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const column = targetType === 'incident' ? 'incident_id' : 'alert_id';
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profile:user_id(username, full_name, role)
        `)
        .eq(column, targetId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }

      setComments((data || []).map(comment => ({
        ...comment,
        comment_type: comment.comment_type as 'note' | 'escalation' | 'resolution' | 'question',
        incident_id: comment.incident_id || undefined,
        alert_id: comment.alert_id || undefined,
        is_internal: comment.is_internal ?? true,
        profile: Array.isArray(comment.profile) ? comment.profile[0] : comment.profile
      })));
    } catch (err: any) {
      console.error('Failed to fetch comments:', err);
      setError(err.message);
      toast({
        title: "Error Loading Comments",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (
    content: string,
    commentType: 'note' | 'escalation' | 'resolution' | 'question' = 'note',
    isInternal: boolean = true
  ) => {
    if (!user || !content.trim()) return;

    try {
      const commentData: any = {
        content: content.trim(),
        comment_type: commentType,
        is_internal: isInternal,
        user_id: user.id
      };

      if (targetType === 'incident') {
        commentData.incident_id = targetId;
      } else {
        commentData.alert_id = targetId;
      }

      const { error } = await supabase
        .from('comments')
        .insert([commentData]);

      if (error) {
        console.error('Error adding comment:', error);
        throw error;
      }

      await fetchComments(); // Refresh comments
      
      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      });
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      toast({
        title: "Add Comment Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: content.trim() })
        .eq('id', commentId)
        .eq('user_id', user.id); // Only allow users to edit their own comments

      if (error) {
        console.error('Error updating comment:', error);
        throw error;
      }

      await fetchComments(); // Refresh comments
      
      toast({
        title: "Comment Updated",
        description: "Your comment has been updated successfully.",
      });
    } catch (err: any) {
      console.error('Failed to update comment:', err);
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Only allow users to delete their own comments

      if (error) {
        console.error('Error deleting comment:', error);
        throw error;
      }

      await fetchComments(); // Refresh comments
      
      toast({
        title: "Comment Deleted",
        description: "Comment has been deleted successfully.",
      });
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (targetId) {
      fetchComments();
    }
  }, [targetId, targetType]);

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    refresh: fetchComments
  };
}