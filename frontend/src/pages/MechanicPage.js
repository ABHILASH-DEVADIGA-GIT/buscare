import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getInspections, fixDetail, quickFix } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, Loader2, ZapIcon } from 'lucide-react';
import { format } from 'date-fns';

const MechanicPage = () => {
  const user = getUser();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fixModal, setFixModal] = useState(false);
  const [quickFixModal, setQuickFixModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [fixNotes, setFixNotes] = useState('');

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const response = await getInspections();
      const myInspections = response.data.data.filter(
        (i) => i.assigned_mechanic === user.user_id && ['ASSIGNED', 'IN_PROGRESS'].includes(i.inspection_status)
      );
      setInspections(myInspections);
    } catch (error) {
      toast.error('Failed to load assignments');
    }
  };

  const handleFixDetail = async () => {
    if (!fixNotes.trim()) {
      toast.error('Please enter fix notes');
      return;
    }

    setLoading(true);
    try {
      await fixDetail({
        inspection_id: selectedDetail.inspection_id,
        detail_id: selectedDetail.detail_id,
        fix_notes: fixNotes,
        fixed_by: user.user_id,
      });

      toast.success('Issue fixed successfully');
      setFixModal(false);
      setFixNotes('');
      fetchInspections();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fix issue');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFix = async () => {
    if (!fixNotes.trim()) {
      toast.error('Please enter fix notes');
      return;
    }

    setLoading(true);
    try {
      await quickFix({
        inspection_id: selectedInspection.inspection_id,
        fix_notes: fixNotes,
        fixed_by: user.user_id,
      });

      toast.success('All issues fixed successfully');
      setQuickFixModal(false);
      setFixNotes('');
      fetchInspections();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to fix issues');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div data-testid="mechanic-page">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-6">My Assignments</h1>

        {inspections.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">No assignments at the moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {inspections.map((inspection) => {
              const failedIssues = inspection.details?.filter(
                (d) => d.answer === 'Fail' && d.question_type !== 'ODO' && d.status !== 'FIXED'
              ) || [];

              return (
                <Card key={inspection.inspection_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl">{inspection.bus_number}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          Assigned: {format(new Date(inspection.assigned_date), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedInspection(inspection);
                          setQuickFixModal(true);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`quick-fix-${inspection.inspection_id}`}
                      >
                        <ZapIcon className="w-4 h-4 mr-2" />
                        Quick Fix All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {failedIssues.map((detail) => (
                        <Card key={detail.detail_id} className="bg-red-50 border-red-200">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900 mb-2">{detail.question_text}</p>
                                <p className="text-sm text-slate-600 mb-2">
                                  <strong>Comment:</strong> {detail.comment}
                                </p>
                                {detail.image_url && (
                                  <img
                                    src={detail.image_url}
                                    alt="Issue"
                                    className="w-32 h-32 object-cover rounded border border-slate-300"
                                  />
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDetail({ ...detail, inspection_id: inspection.inspection_id });
                                  setFixModal(true);
                                }}
                                className="bg-blue-900"
                                data-testid={`fix-${detail.detail_id}`}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Fix
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Fix Detail Modal */}
        <Dialog open={fixModal} onOpenChange={setFixModal}>
          <DialogContent data-testid="fix-detail-modal">
            <DialogHeader>
              <DialogTitle>Fix Issue</DialogTitle>
              <DialogDescription>Enter details about the fix</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="font-semibold mb-2">{selectedDetail?.question_text}</p>
                <Textarea
                  placeholder="Describe what you fixed..."
                  value={fixNotes}
                  onChange={(e) => setFixNotes(e.target.value)}
                  rows={4}
                  data-testid="fix-notes-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFixModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleFixDetail} disabled={loading} className="bg-blue-900" data-testid="confirm-fix-button">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Mark as Fixed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Fix Modal */}
        <Dialog open={quickFixModal} onOpenChange={setQuickFixModal}>
          <DialogContent data-testid="quick-fix-modal">
            <DialogHeader>
              <DialogTitle>Quick Fix All Issues</DialogTitle>
              <DialogDescription>This will mark all issues as fixed with the same notes</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Textarea
                  placeholder="Describe what you fixed..."
                  value={fixNotes}
                  onChange={(e) => setFixNotes(e.target.value)}
                  rows={4}
                  data-testid="quick-fix-notes-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setQuickFixModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleQuickFix} disabled={loading} className="bg-green-600" data-testid="confirm-quick-fix-button">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Fix All Issues
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MechanicPage;
