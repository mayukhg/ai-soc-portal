import { useState } from 'react';
import { MessageSquare, User, Clock, Tag, AlertTriangle, CheckCircle, ArrowRight, Send, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useAuth } from '@/contexts/AuthContext';

interface CollaborationPanelProps {
  targetId: string;
  targetType: 'incident' | 'alert';
  title?: string;
}

export function CollaborationPanel({ targetId, targetType, title }: CollaborationPanelProps) {
  const { user } = useAuth();
  const { comments, loading, addComment } = useCollaboration(targetId, targetType);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'note' | 'escalation' | 'resolution' | 'question'>('note');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(newComment, commentType);
      setNewComment('');
      setCommentType('note');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'escalation': return 'bg-critical/10 text-critical border-critical/20';
      case 'resolution': return 'bg-success/10 text-success border-success/20';
      case 'question': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-info/10 text-info border-info/20';
    }
  };

  const getCommentTypeIcon = (type: string) => {
    switch (type) {
      case 'escalation': return <ArrowRight className="h-3 w-3" />;
      case 'resolution': return <CheckCircle className="h-3 w-3" />;
      case 'question': return <AlertTriangle className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'analyst_tier3': return 'text-primary';
      case 'management': return 'text-accent';
      case 'admin': return 'text-critical';
      default: return 'text-muted-foreground';
    }
  };

  const formatRole = (role: string) => {
    return role.replace('analyst_', 'T').replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collaboration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Collaboration</h2>
          <p className="text-muted-foreground">
            {title ? `Discussion for: ${title}` : `${targetType} discussion thread`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline">
            <MessageSquare className="h-3 w-3 mr-1" />
            {comments.length} Comments
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Discussion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comments List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No comments yet. Start the discussion!</p>
              </div>
            ) : (
              comments.map((comment, index) => (
                <div 
                  key={comment.id}
                  className="flex items-start space-x-3 animate-slide-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {comment.profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
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
            <form onSubmit={handleSubmitComment} className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-4">
                <Select value={commentType} onValueChange={(value: any) => setCommentType(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="escalation">Escalation</SelectItem>
                    <SelectItem value="resolution">Resolution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-start space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add your comment or analysis..."
                    className="min-h-[80px] resize-none"
                    disabled={isSubmitting}
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Tip: Use @username to mention team members
                    </div>
                    <Button 
                      type="submit" 
                      size="sm"
                      disabled={!newComment.trim() || isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                      ) : (
                        <Send className="h-3 w-3 mr-2" />
                      )}
                      {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {!user && (
            <div className="text-center py-4 border-t">
              <p className="text-muted-foreground">Please log in to participate in the discussion.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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