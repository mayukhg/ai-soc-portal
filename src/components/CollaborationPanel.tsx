import { useState } from 'react';
import { MessageSquare, User, Clock, Tag, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  type: 'comment' | 'status_change' | 'assignment';
  metadata?: {
    oldValue?: string;
    newValue?: string;
  };
}

interface Alert {
  id: string;
  title: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  assignee: string | null;
  tier: 1 | 2 | 3;
  tags: string[];
  comments: Comment[];
}

const mockAlert: Alert = {
  id: 'ALT-2024-001',
  title: 'Suspicious PowerShell Execution',
  status: 'investigating',
  assignee: 'Sarah Chen',
  tier: 2,
  tags: ['powershell', 'credential-dump', 'lateral-movement'],
  comments: [
    {
      id: '1',
      author: 'John Doe',
      content: 'Initial triage complete. This appears to be a legitimate threat. The PowerShell command is attempting to dump LSASS memory.',
      timestamp: '2 hours ago',
      type: 'comment'
    },
    {
      id: '2',
      author: 'System',
      content: 'Alert escalated from Tier 1 to Tier 2',
      timestamp: '1 hour ago',
      type: 'status_change',
      metadata: { oldValue: 'Tier 1', newValue: 'Tier 2' }
    },
    {
      id: '3',
      author: 'Sarah Chen',
      content: 'Running additional forensics. Found network connection to suspicious IP. Investigating potential C2 communication.',
      timestamp: '45 minutes ago',
      type: 'comment'
    }
  ]
};

const analysts = [
  { id: '1', name: 'John Doe', tier: 1 },
  { id: '2', name: 'Sarah Chen', tier: 2 },
  { id: '3', name: 'Mike Wilson', tier: 2 },
  { id: '4', name: 'Dr. Emma Thompson', tier: 3 }
];

export function CollaborationPanel() {
  const [alert, setAlert] = useState<Alert>(mockAlert);
  const [newComment, setNewComment] = useState('');
  const [newTag, setNewTag] = useState('');

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Current User',
      content: newComment,
      timestamp: 'Just now',
      type: 'comment'
    };

    setAlert(prev => ({
      ...prev,
      comments: [...prev.comments, comment]
    }));

    setNewComment('');
  };

  const handleStatusChange = (newStatus: string) => {
    const statusChange: Comment = {
      id: Date.now().toString(),
      author: 'Current User',
      content: `Status changed from ${alert.status} to ${newStatus}`,
      timestamp: 'Just now',
      type: 'status_change',
      metadata: { oldValue: alert.status, newValue: newStatus }
    };

    setAlert(prev => ({
      ...prev,
      status: newStatus as Alert['status'],
      comments: [...prev.comments, statusChange]
    }));
  };

  const handleAssignmentChange = (analystName: string) => {
    const assignment: Comment = {
      id: Date.now().toString(),
      author: 'Current User',
      content: `Alert assigned to ${analystName}`,
      timestamp: 'Just now',
      type: 'assignment'
    };

    setAlert(prev => ({
      ...prev,
      assignee: analystName,
      comments: [...prev.comments, assignment]
    }));
  };

  const handleAddTag = () => {
    if (!newTag.trim() || alert.tags.includes(newTag)) return;

    setAlert(prev => ({
      ...prev,
      tags: [...prev.tags, newTag]
    }));

    setNewTag('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-info text-primary-foreground';
      case 'investigating': return 'bg-warning text-primary-foreground';
      case 'resolved': return 'bg-success text-primary-foreground';
      case 'false_positive': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertTriangle className="h-3 w-3" />;
      case 'investigating': return <Clock className="h-3 w-3" />;
      case 'resolved': return <CheckCircle className="h-3 w-3" />;
      case 'false_positive': return <CheckCircle className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Alert Details */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span>Alert Collaboration</span>
              </CardTitle>
              <Badge variant="outline">ID: {alert.id}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{alert.title}</h3>
              <Badge className={getStatusColor(alert.status)}>
                {getStatusIcon(alert.status)}
                <span className="ml-1 capitalize">{alert.status.replace('_', ' ')}</span>
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {alert.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comments Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Investigation Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {alert.comments.map((comment, index) => (
              <div key={comment.id} className="flex space-x-3 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={
                    comment.type === 'status_change' || comment.type === 'assignment'
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-primary text-primary-foreground'
                  }>
                    {comment.author === 'System' ? 'S' : comment.author.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                    {comment.type !== 'comment' && (
                      <Badge variant="outline" className="text-xs">
                        {comment.type === 'status_change' ? 'Status' : 'Assignment'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    comment.type === 'comment' 
                      ? 'bg-muted/50 border border-border/50'
                      : 'bg-accent/10 border border-accent/20'
                  }`}>
                    <p className="text-sm">{comment.content}</p>
                    
                    {comment.metadata && (
                      <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                        <span>{comment.metadata.oldValue}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium">{comment.metadata.newValue}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add Comment */}
            <div className="border-t border-border pt-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Add investigation notes, findings, or questions..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Tag className="h-3 w-3 mr-1" />
                      Tag Team
                    </Button>
                    <Button variant="outline" size="sm">
                      Attach File
                    </Button>
                  </div>
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                    Add Comment
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Change */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Change Status</label>
              <Select onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Update status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign To</label>
              <Select onValueChange={handleAssignmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select analyst..." />
                </SelectTrigger>
                <SelectContent>
                  {analysts.map((analyst) => (
                    <SelectItem key={analyst.id} value={analyst.name}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">T{analyst.tier}</Badge>
                        <span>{analyst.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current Assignment */}
            {alert.assignee && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Currently assigned to:</span>
                </div>
                <p className="text-accent font-medium">{alert.assignee}</p>
              </div>
            )}

            {/* Escalation */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Escalate to Tier {alert.tier + 1}
              </Button>
              <Button variant="secondary" className="w-full">
                Request Supervisor Review
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tags Management */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {alert.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-border rounded"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button size="sm" onClick={handleAddTag}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Escalation Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tier 1:</span>
              <span className="text-muted-foreground">Initial triage</span>
            </div>
            <div className="flex justify-between">
              <span>Tier 2:</span>
              <span className="text-muted-foreground">Investigation</span>
            </div>
            <div className="flex justify-between">
              <span>Tier 3:</span>
              <span className="text-muted-foreground">Advanced analysis</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}