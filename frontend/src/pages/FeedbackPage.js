import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getFeedback, resolveFeedback, getBuses } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Eye, Image, Mail, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const FeedbackPage = () => {
  const user = getUser();
  const [feedbackList, setFeedbackList] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolveModal, setResolveModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [notes, setNotes] = useState('');
  const [selectedBusFilter, setSelectedBusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [feedbackRes, busesRes] = await Promise.all([
        getFeedback(),
        getBuses(),
      ]);
      setFeedbackList(feedbackRes.data.data || []);
      setBuses(busesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load feedback');
    }
  };

  const filteredFeedback = feedbackList.filter((feedback) => {
    if (selectedBusFilter === 'all') return true;
    return feedback.bus_id === selectedBusFilter;
  });

  const handleResolve = async () => {
    setLoading(true);
    try {
      await resolveFeedback({
        feedback_id: selectedFeedback.feedback_id,
        resolved_by: user.user_id,
        notes,
      });

      toast.success('Feedback resolved successfully');
      setResolveModal(false);
      setNotes('');
      fetchData();
    } catch (error) {
      toast.error('Failed to resolve feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleViewFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setViewModal(true);
  };

  const getStatusBadge = (status) => {
    const config = {
      NEW: { label: 'New', className: 'bg-blue-100 text-blue-800' },
      REVIEWED: { label: 'Reviewed', className: 'bg-amber-100 text-amber-800' },
      RESOLVED: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
    };

    const { label, className } = config[status] || { label: status, className: '' };
    return <Badge className={`${className} px-2 py-1 rounded-full text-xs font-bold`}>{label}</Badge>;
  };

  return (
    <Layout>
      <div data-testid="feedback-management-page">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-6">Passenger Feedback</h1>

        {/* Bus Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Filter by Bus:</Label>
            <Select value={selectedBusFilter} onValueChange={setSelectedBusFilter}>
              <SelectTrigger className="w-[200px]" data-testid="bus-filter-select">
                <SelectValue placeholder="All Buses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buses</SelectItem>
                {buses.map((bus) => (
                  <SelectItem key={bus.bus_id} value={bus.bus_id}>
                    {bus.bus_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="new" className="space-y-6">
          <TabsList>
            <TabsTrigger value="new" data-testid="tab-new">New</TabsTrigger>
            <TabsTrigger value="reviewed" data-testid="tab-reviewed">Reviewed</TabsTrigger>
            <TabsTrigger value="resolved" data-testid="tab-resolved">Resolved</TabsTrigger>
          </TabsList>

          {['new', 'reviewed', 'resolved'].map((status) => (
            <TabsContent key={status} value={status}>
              <div className="space-y-4">
                {filteredFeedback
                  .filter((f) => f.status === status.toUpperCase())
                  .map((feedback) => (
                    <Card key={feedback.feedback_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{feedback.bus_number}</CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                              {format(new Date(feedback.created_date), 'dd MMM yyyy, hh:mm a')}
                            </p>
                          </div>
                          {getStatusBadge(feedback.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-700 mb-4 line-clamp-2">{feedback.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {feedback.image_url && (
                            <Badge variant="outline" className="text-blue-600">
                              <Image className="w-3 h-3 mr-1" /> Has Image
                            </Badge>
                          )}
                          {feedback.email && (
                            <Badge variant="outline" className="text-green-600">
                              <Mail className="w-3 h-3 mr-1" /> Email Provided
                            </Badge>
                          )}
                          {feedback.resolution_notes && (
                            <Badge variant="outline" className="text-purple-600">
                              <MessageSquare className="w-3 h-3 mr-1" /> Has Notes
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* View Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewFeedback(feedback)}
                            data-testid={`view-feedback-${feedback.feedback_id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>

                          {feedback.status !== 'RESOLVED' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFeedback(feedback);
                                setResolveModal(true);
                              }}
                              className="bg-green-600"
                              data-testid={`resolve-${feedback.feedback_id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark as Resolved
                            </Button>
                          )}
                        </div>

                        {feedback.resolved_date && (
                          <p className="text-sm text-green-600 font-semibold mt-2">
                            Resolved on {format(new Date(feedback.resolved_date), 'dd MMM yyyy')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                {filteredFeedback.filter((f) => f.status === status.toUpperCase()).length === 0 && (
                  <div className="py-12 text-center text-slate-500">
                    No {status} feedback found
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* View Feedback Modal */}
        <Dialog open={viewModal} onOpenChange={setViewModal}>
          <DialogContent className="max-w-2xl" data-testid="view-feedback-modal">
            <DialogHeader>
              <DialogTitle className="text-xl">Feedback Details</DialogTitle>
              {selectedFeedback && (
                <DialogDescription>
                  Bus: {selectedFeedback.bus_number} | Submitted: {format(new Date(selectedFeedback.created_date), 'dd MMM yyyy, hh:mm a')}
                </DialogDescription>
              )}
            </DialogHeader>

            {selectedFeedback && (
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Status:</span>
                  {getStatusBadge(selectedFeedback.status)}
                </div>

                {/* Description */}
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <Label className="text-sm text-slate-500 flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4" /> Passenger Feedback
                  </Label>
                  <p className="text-slate-900">{selectedFeedback.description}</p>
                </div>

                {/* Image */}
                {selectedFeedback.image_url && (
                  <div>
                    <Label className="text-sm text-slate-500 flex items-center gap-2 mb-2">
                      <Image className="w-4 h-4" /> Attached Image
                    </Label>
                    <img
                      src={selectedFeedback.image_url}
                      alt="Feedback attachment"
                      className="max-w-full max-h-80 object-contain rounded-lg border cursor-pointer hover:opacity-90"
                      onClick={() => window.open(selectedFeedback.image_url, '_blank')}
                    />
                  </div>
                )}

                {/* Email */}
                {selectedFeedback.email && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <Label className="text-sm text-blue-600 flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4" /> Contact Email
                    </Label>
                    <p className="text-blue-900 font-medium">{selectedFeedback.email}</p>
                    {selectedFeedback.want_update && (
                      <p className="text-xs text-blue-600 mt-1">
                        ✓ Passenger requested updates on resolution
                      </p>
                    )}
                  </div>
                )}

                {/* Resolution Notes */}
                {selectedFeedback.resolution_notes && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <Label className="text-sm text-green-600 flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4" /> Resolution Notes
                    </Label>
                    <p className="text-green-900">{selectedFeedback.resolution_notes}</p>
                    {selectedFeedback.resolved_date && (
                      <p className="text-xs text-green-600 mt-2">
                        Resolved on {format(new Date(selectedFeedback.resolved_date), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              {selectedFeedback?.status !== 'RESOLVED' && (
                <Button
                  onClick={() => {
                    setViewModal(false);
                    setResolveModal(true);
                  }}
                  className="bg-green-600"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Resolved
                </Button>
              )}
              <Button variant="outline" onClick={() => setViewModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve Modal */}
        <Dialog open={resolveModal} onOpenChange={setResolveModal}>
          <DialogContent data-testid="resolve-feedback-modal">
            <DialogHeader>
              <DialogTitle>Resolve Feedback</DialogTitle>
              <DialogDescription>Add resolution notes (optional)</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Textarea
                placeholder="Resolution notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                data-testid="resolution-notes"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleResolve} disabled={loading} className="bg-green-600" data-testid="confirm-resolve-button">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Mark as Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FeedbackPage;
