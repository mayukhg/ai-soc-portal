import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { BreakGlassAccess } from '@/services/AzureADService';
import { AlertTriangle, Shield, Clock, User, CheckCircle, XCircle } from 'lucide-react';

interface BreakGlassAccessProps {
  variant?: 'button' | 'card';
}

export function BreakGlassAccess({ variant = 'button' }: BreakGlassAccessProps) {
  const { user, userRole, hasBreakGlassAccess, requestBreakGlassAccess, approveBreakGlassAccess, getPendingBreakGlassRequests, hasPermission } = useAuth();
  const { toast } = useToast();
  
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [durationHours, setDurationHours] = useState(4);
  const [pendingRequests, setPendingRequests] = useState<BreakGlassAccess[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = userRole?.role === 'admin';
  const canRequestBreakGlass = hasPermission('request_break_glass') || isAdmin;

  useEffect(() => {
    if (isAdmin) {
      loadPendingRequests();
    }
  }, [isAdmin]);

  const loadPendingRequests = async () => {
    try {
      const requests = await getPendingBreakGlassRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  };

  const handleRequestBreakGlass = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for break glass access.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await requestBreakGlassAccess(reason, durationHours);
      toast({
        title: "Break Glass Access Requested",
        description: "Your request has been submitted for approval.",
      });
      setIsRequestDialogOpen(false);
      setReason('');
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to submit break glass access request.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setLoading(true);
    try {
      await approveBreakGlassAccess(requestId);
      toast({
        title: "Access Approved",
        description: "Break glass access has been approved.",
      });
      await loadPendingRequests();
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve break glass access.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours: number) => {
    if (hours === 1) return '1 hour';
    return `${hours} hours`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (!canRequestBreakGlass) {
    return null;
  }

  if (variant === 'card') {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Shield className="h-5 w-5" />
            Break Glass Access
          </CardTitle>
          <CardDescription>
            Emergency access for critical situations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasBreakGlassAccess ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                You currently have break glass access enabled.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Break glass access provides temporary administrative privileges for emergency situations.
                </AlertDescription>
              </Alert>
              
              <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-100">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Request Break Glass Access
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Break Glass Access</DialogTitle>
                    <DialogDescription>
                      Provide a reason for requesting emergency administrative access.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reason">Reason for Access</Label>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Describe the emergency situation requiring administrative access..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (hours)</Label>
                      <select
                        id="duration"
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value={1}>1 hour</option>
                        <option value={2}>2 hours</option>
                        <option value={4}>4 hours</option>
                        <option value={8}>8 hours</option>
                        <option value={24}>24 hours</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleRequestBreakGlass}
                      disabled={loading || !reason.trim()}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {loading ? 'Requesting...' : 'Request Access'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Break Glass Button */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
            disabled={hasBreakGlassAccess}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {hasBreakGlassAccess ? 'Break Glass Active' : 'Break Glass Access'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Break Glass Access</DialogTitle>
            <DialogDescription>
              Provide a reason for requesting emergency administrative access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for Access</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the emergency situation requiring administrative access..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (hours)</Label>
              <select
                id="duration"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestBreakGlass}
              disabled={loading || !reason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Requesting...' : 'Request Access'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Panel for Approving Requests */}
      {isAdmin && (
        <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              <Shield className="mr-2 h-4 w-4" />
              Manage Break Glass Requests ({pendingRequests.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Break Glass Access Requests</DialogTitle>
              <DialogDescription>
                Review and approve pending break glass access requests.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending break glass access requests.
                </p>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id} className="border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">User ID: {request.userId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Requested: {formatDate(request.requestedAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Expires: {formatDate(request.expiresAt)}
                            </span>
                          </div>
                          <div className="mt-2">
                            <Label className="text-sm font-medium">Reason:</Label>
                            <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsAdminDialogOpen(false)}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            Deny
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 