import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Interface for comment data structure
 * Represents a comment in the collaboration system
 */
interface Comment {
  id: string;                    // Unique comment identifier
  incident_id?: string;          // Associated incident ID (optional)
  alert_id?: string;             // Associated alert ID (optional)
  user_id: string;               // User who created the comment
  content: string;               // Comment text content
  comment_type: 'note' | 'escalation' | 'resolution' | 'question';  // Type of comment
  is_internal: boolean;          // Whether comment is internal or external
  created_at: string;            // Creation timestamp
  updated_at: string;            // Last update timestamp
  profile?: {                    // User profile information
    username: string;
    full_name: string;
    role: string;
  };
}

/**
 * Custom hook for managing collaboration features
 * Handles comments, discussions, and team communication for incidents and alerts
 * 
 * @param targetId - The ID of the incident or alert being discussed
 * @param targetType - Whether the target is an 'incident' or 'alert'
 * @returns Object containing comments, loading state, error state, and CRUD functions
 */
export function useCollaboration(targetId: string, targetType: 'incident' | 'alert') {
  const { user } = useAuth();  // Get current authenticated user
  const { toast } = useToast(); // Toast notification system
  
  // State management for comments and UI
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all comments for the target incident or alert
   * Includes user profile information for display
   */
  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine which column to query based on target type
      const column = targetType === 'incident' ? 'incident_id' : 'alert_id';
      
      // Query comments with user profile information
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

      // Transform and type the comment data
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

  /**
   * Add a new comment to the discussion
   * 
   * @param content - The comment text content
   * @param commentType - Type of comment (note, escalation, resolution, question)
   * @param isInternal - Whether the comment is internal or visible to external parties
   */
  const addComment = async (
    content: string,
    commentType: 'note' | 'escalation' | 'resolution' | 'question' = 'note',
    isInternal: boolean = true
  ) => {
    if (!user || !content.trim()) return;

    try {
      // Prepare comment data
      const commentData: any = {
        content: content.trim(),
        comment_type: commentType,
        is_internal: isInternal,
        user_id: user.id
      };

      // Set the appropriate foreign key based on target type
      if (targetType === 'incident') {
        commentData.incident_id = targetId;
      } else {
        commentData.alert_id = targetId;
      }

      // Insert the comment into the database
      const { error } = await supabase
        .from('comments')
        .insert([commentData]);

      if (error) {
        console.error('Error adding comment:', error);
        throw error;
      }

      await fetchComments(); // Refresh comments to show the new one
      
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

  /**
   * Update an existing comment
   * Users can only edit their own comments
   * 
   * @param commentId - ID of the comment to update
   * @param content - New content for the comment
   */
  const updateComment = async (commentId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      // Update comment, ensuring user can only edit their own comments
      const { error } = await supabase
        .from('comments')
        .update({ content: content.trim() })
        .eq('id', commentId)
        .eq('user_id', user.id);

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

  /**
   * Delete a comment
   * Users can only delete their own comments
   * 
   * @param commentId - ID of the comment to delete
   */
  const deleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      // Delete comment, ensuring user can only delete their own comments
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

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

  // Fetch comments when target changes
  useEffect(() => {
    if (targetId) {
      fetchComments();
    }
  }, [targetId, targetType]);

  // Return all necessary functions and state for the collaboration system
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