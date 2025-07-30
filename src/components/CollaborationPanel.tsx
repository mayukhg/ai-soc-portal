import { useState } from 'react';
import { MessageSquare, Send, ArrowRight, CheckCircle, AlertTriangle, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCollaboration } from '@/hooks/useCollaboration';

/**
 * Props interface for the CollaborationPanel component
 * Defines the configuration for the collaboration system
 */
interface CollaborationPanelProps {
  targetId: string;                    // ID of the incident or alert being discussed
  targetType: 'incident' | 'alert';   // Type of target (incident or alert)
  title?: string;                      // Optional title for the panel
}

/**
 * CollaborationPanel Component
 * 
 * Provides a comprehensive collaboration interface for team communication
 * around incidents and alerts. Features include:
 * - Real-time comment display
 * - Comment categorization (note, escalation, resolution, question)
 * - User role-based styling
 * - Quick action buttons for common comment types
 * - Time-based formatting for comments
 * 
 * @param targetId - The ID of the incident or alert being discussed
 * @param targetType - Whether the target is an 'incident' or 'alert'
 * @param title - Optional title for the collaboration panel
 */
export function CollaborationPanel({ targetId, targetType, title }: CollaborationPanelProps) {
  const { user } = useAuth();  // Get current authenticated user
  const { comments, loading, addComment } = useCollaboration(targetId, targetType);  // Collaboration hook
  
  // Local state for comment form
  const [newComment, setNewComment] = useState('');  // New comment text
  const [commentType, setCommentType] = useState<'note' | 'escalation' | 'resolution' | 'question'>('note');  // Comment type
  const [isSubmitting, setIsSubmitting] = useState(false);  // Form submission state

  /**
   * Handle comment form submission
   * Prevents empty submissions and handles loading state
   */
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(newComment, commentType);
      setNewComment('');  // Clear form after successful submission
      setCommentType('note');  // Reset to default comment type
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Format timestamp to relative time (e.g., "2 hours ago")
   * 
   * @param dateString - ISO date string to format
   * @returns Formatted relative time string
   */
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  /**
   * Get CSS classes for comment type styling
   * Different comment types have different color schemes
   * 
   * @param type - Comment type
   * @returns CSS classes for styling
   */
  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'escalation': return 'bg-critical/10 text-critical border-critical/20';
      case 'resolution': return 'bg-success/10 text-success border-success/20';
      case 'question': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-info/10 text-info border-info/20';
    }
  };

  /**
   * Get appropriate icon for comment type
   * 
   * @param type - Comment type
   * @returns React component for the icon
   */
  const getCommentTypeIcon = (type: string) => {
    switch (type) {
      case 'escalation': return <ArrowRight className="h-3 w-3" />;
      case 'resolution': return <CheckCircle className="h-3 w-3" />;
      case 'question': return <AlertTriangle className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  /**
   * Get CSS classes for user role styling
   * Different roles have different color schemes
   * 
   * @param role - User role
   * @returns CSS classes for role styling
   */
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'analyst_tier3': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'analyst_tier2': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'analyst_tier1': return 'bg-green-100 text-green-800 border-green-200';
      case 'management': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Format user role for display
   * Converts role strings to user-friendly display names
   * 
   * @param role - User role string
   * @returns Formatted role display name
   */
  const formatRole = (role: string) => {
    switch (role) {
      case 'analyst_tier3': return 'Tier 3';
      case 'analyst_tier2': return 'Tier 2';
      case 'analyst_tier1': return 'Tier 1';
      case 'management': return 'Management';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {title || `${targetType === 'incident' ? 'Incident' : 'Alert'} Discussion`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comments Display */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading comments...</p>
              </div>
            ) : (
              comments.map((comment, index) => (
                <div 
                  key={comment.id}
                  className="flex space-x-3"
                >
                  {/* User Avatar */}
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {comment.profile?.full_name?.charAt(0) || comment.profile?.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    {/* Comment Header with User Info and Type */}
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {comment.profile?.full_name || comment.profile?.username || 'Unknown User'}
                      </span>
                      {comment.profile?.role && (
                        <Badge variant="outline" className={`text-xs ${getRoleColor(comment.profile.role)}`}>
                          {formatRole(comment.profile.role)}
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getCommentTypeColor(comment.comment_type)}`}
                      >
                        {getCommentTypeIcon(comment.comment_type)}
                        {comment.comment_type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    
                    {/* Comment Text */}
                    <div className="bg-accent/5 rounded-lg p-3 border">
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          {user && (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  disabled={isSubmitting}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newComment.trim() || isSubmitting}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Escalate Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCommentType('escalation');
                setNewComment('Escalating this issue for further investigation by Tier 3 team.');
              }}
            >
              <ArrowRight className="h-3 w-3 mr-2" />
              Escalate
            </Button>
            
            {/* Ask Question Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCommentType('question');
                setNewComment('I have a question about ');
              }}
            >
              <AlertTriangle className="h-3 w-3 mr-2" />
              Ask Question
            </Button>
            
            {/* Mark Resolved Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCommentType('resolution');
                setNewComment('Issue resolved. ');
              }}
            >
              <CheckCircle className="h-3 w-3 mr-2" />
              Mark Resolved
            </Button>
            
            {/* Add Note Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setCommentType('note');
                setNewComment('Adding additional context: ');
              }}
            >
              <MessageSquare className="h-3 w-3 mr-2" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}