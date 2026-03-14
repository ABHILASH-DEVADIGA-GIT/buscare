import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { getBuses, getChecklist, createInspection, uploadImage, getInspections, assignMechanic, getMechanics, verifyInspection, addProblem, getInspectionById } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Upload, Check, X, Wrench, CheckCircle2, AlertTriangle, Loader2, Plus, Mic, Video, Camera, Square, Circle, Eye, Image, Volume2 } from 'lucide-react';
import { format } from 'date-fns';
import { useReactMediaRecorder } from 'react-media-recorder';

const InspectionPage = () => {
  const user = getUser();
  const { t } = useLanguage();
  const isDriver = user?.role === 'DRIVER';
  const isSupervisor = ['SUPERVISOR', 'ADMIN', 'OWNER'].includes(user?.role);
  const isMechanic = user?.role === 'MECHANIC';

  const [buses, setBuses] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedBusFilter, setSelectedBusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weekFilter, setWeekFilter] = useState('all');

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedBus, setSelectedBus] = useState('');
  const [answers, setAnswers] = useState({});

  // Modal states
  const [assignModal, setAssignModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedMechanic, setSelectedMechanic] = useState('');

  // View Inspection modal state
  const [viewModal, setViewModal] = useState(false);
  const [viewInspectionData, setViewInspectionData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Add Problem modal states
  const [addProblemModal, setAddProblemModal] = useState(false);
  const [problemData, setProblemData] = useState({
    bus_id: '',
    problem_description: '',
    image_url: '',
    audio_url: '',
    video_url: '',
  });
  
  // Media recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Audio recording hook
  const {
    status: audioStatus,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    mediaBlobUrl: audioBlobUrl,
  } = useReactMediaRecorder({ audio: true, video: false });

  // Video recording hook
  const {
    status: videoStatus,
    startRecording: startVideoRecording,
    stopRecording: stopVideoRecording,
    mediaBlobUrl: videoBlobUrl,
    previewStream,
  } = useReactMediaRecorder({ video: true, audio: true });

  // Track which question is currently recording
  const [audioRecording, setAudioRecording] = useState(null);
  const [videoRecording, setVideoRecording] = useState(null);

  // Handle audio recording toggle
  const handleAudioToggle = () => {
    if (audioStatus === 'recording') {
      stopAudioRecording();
      setIsRecordingAudio(false);
    } else {
      startAudioRecording();
      setIsRecordingAudio(true);
    }
  };

  // Handle video recording toggle
  const handleVideoToggle = () => {
    if (videoStatus === 'recording') {
      stopVideoRecording();
      setIsRecordingVideo(false);
    } else {
      startVideoRecording();
      setIsRecordingVideo(true);
    }
  };

  // Convert blob URL to base64 for storage
  const blobUrlToBase64 = async (blobUrl) => {
    if (!blobUrl) return null;
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting blob to base64:', error);
      return null;
    }
  };

  // Update problem data when audio recording completes
  useEffect(() => {
    if (audioBlobUrl && audioStatus === 'stopped') {
      blobUrlToBase64(audioBlobUrl).then((base64) => {
        if (base64) {
          setProblemData(prev => ({ ...prev, audio_url: base64 }));
          toast.success(t('record_audio') + ' - Done!');
        }
      });
    }
  }, [audioBlobUrl, audioStatus]);

  // Update problem data when video recording completes
  useEffect(() => {
    if (videoBlobUrl && videoStatus === 'stopped') {
      blobUrlToBase64(videoBlobUrl).then((base64) => {
        if (base64) {
          setProblemData(prev => ({ ...prev, video_url: base64 }));
          toast.success(t('record_video') + ' - Done!');
        }
      });
    }
  }, [videoBlobUrl, videoStatus]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [busesRes, checklistRes, inspectionsRes, mechanicsRes] = await Promise.all([
        getBuses(),
        getChecklist(),
        getInspections(),
        isSupervisor ? getMechanics() : Promise.resolve({ data: { data: [] } }),
      ]);

      setBuses(busesRes.data.data || []);
      setChecklist(checklistRes.data.data || []);
      setInspections(inspectionsRes.data.data || []);
      setMechanics(mechanicsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: { ...answers[questionId], answer: value },
    });
  };

  const handleCommentChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: { ...answers[questionId], comment: value },
    });
  };

  const handleImageUpload = async (questionId, file) => {
    try {
      const response = await uploadImage(file);
      setAnswers({
        ...answers,
        [questionId]: { ...answers[questionId], image_url: response.data.data.url },
      });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Image upload failed');
    }
  };

  // Audio recording for specific question
  const startQuestionAudioRecording = (questionId) => {
    setAudioRecording(questionId);
    startAudioRecording();
  };

  const stopQuestionAudioRecording = async () => {
    stopAudioRecording();
    // Wait for mediaBlobUrl to be available
    setTimeout(async () => {
      if (audioBlobUrl && audioRecording) {
        try {
          const response = await fetch(audioBlobUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setAnswers((prev) => ({
              ...prev,
              [audioRecording]: { ...prev[audioRecording], audio_url: reader.result },
            }));
            toast.success('Audio recorded');
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Audio save error:', error);
        }
      }
      setAudioRecording(null);
    }, 500);
  };

  // Video recording for specific question
  const startQuestionVideoRecording = (questionId) => {
    setVideoRecording(questionId);
    startVideoRecording();
  };

  const stopQuestionVideoRecording = async () => {
    stopVideoRecording();
    // Wait for mediaBlobUrl to be available
    setTimeout(async () => {
      if (videoBlobUrl && videoRecording) {
        try {
          const response = await fetch(videoBlobUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setAnswers((prev) => ({
              ...prev,
              [videoRecording]: { ...prev[videoRecording], video_url: reader.result },
            }));
            toast.success('Video recorded');
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Video save error:', error);
        }
      }
      setVideoRecording(null);
    }, 500);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const details = checklist.map((q) => ({
        question_id: q.question_id,
        question_text: q.question_text,
        question_type: q.question_type,
        answer: answers[q.question_id]?.answer || 'Pass',
        comment: answers[q.question_id]?.comment || null,
        image_url: answers[q.question_id]?.image_url || null,
        audio_url: answers[q.question_id]?.audio_url || null,
        video_url: answers[q.question_id]?.video_url || null,
      }));

      // Validate failures - only require comment, media is optional
      for (const detail of details) {
        if (detail.answer === 'Fail' && detail.question_type !== 'ODO') {
          if (!detail.comment) {
            toast.error(`${detail.question_text} requires a comment`);
            setLoading(false);
            return;
          }
        }
      }

      await createInspection({
        bus_id: selectedBus,
        driver_id: user.user_id,
        details,
        client_id: user.client_id,
      });

      toast.success('Inspection submitted successfully');
      
      // Reset
      setStep(1);
      setSelectedBus('');
      setAnswers({});
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMechanic = async () => {
    if (!selectedMechanic) {
      toast.error('Please select a mechanic');
      return;
    }

    try {
      await assignMechanic({
        inspection_id: selectedInspection.inspection_id,
        mechanic_id: selectedMechanic,
        assigned_by: user.user_id,
      });

      toast.success('Mechanic assigned successfully');
      setAssignModal(false);
      setSelectedMechanic('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Assignment failed');
    }
  };

  const handleVerify = async (inspectionId, action) => {
    try {
      await verifyInspection({
        inspection_id: inspectionId,
        action,
        verified_by: user.user_id,
      });

      toast.success(action === 'VERIFY' ? 'Inspection verified' : 'Reassigned to mechanic');
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  // View inspection details
  const handleViewInspection = async (inspectionId) => {
    setViewLoading(true);
    setViewModal(true);
    try {
      const response = await getInspectionById(inspectionId);
      setViewInspectionData(response.data.data);
    } catch (error) {
      toast.error('Failed to load inspection details');
      setViewModal(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleAddProblem = async () => {
    if (!problemData.bus_id || !problemData.problem_description) {
      toast.error('Please select a bus and describe the problem');
      return;
    }

    setLoading(true);
    try {
      await addProblem({
        bus_id: problemData.bus_id,
        problem_description: problemData.problem_description,
        image_url: problemData.image_url,
        audio_url: problemData.audio_url,
        video_url: problemData.video_url,
        client_id: user.client_id,
        reported_by: user.user_id,
      });

      toast.success('Problem reported successfully');
      setAddProblemModal(false);
      setProblemData({
        bus_id: '',
        problem_description: '',
        image_url: '',
        audio_url: '',
        video_url: '',
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to add problem');
    } finally {
      setLoading(false);
    }
  };

  const handleProblemImageUpload = async (file) => {
    try {
      const response = await uploadImage(file);
      setProblemData({ ...problemData, image_url: response.data.data.url });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Image upload failed');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      PASSED: { label: 'Passed', className: 'bg-emerald-100 text-emerald-800' },
      FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800' },
      ASSIGNED: { label: 'Assigned', className: 'bg-blue-100 text-blue-800' },
      IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-100 text-amber-800' },
      RESOLVED: { label: 'Resolved', className: 'bg-purple-100 text-purple-800' },
      FIXED: { label: 'Fixed', className: 'bg-green-100 text-green-800' },
    };

    const { label, className } = config[status] || { label: status, className: '' };
    return <Badge className={`${className} px-2 py-1 rounded-full text-xs font-bold`} data-testid={`status-badge-${status}`}>{label}</Badge>;
  };

  // Driver View - Inspection Wizard
  if (isDriver) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto" data-testid="driver-inspection-form">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">New Inspection</h1>
            <Button 
              onClick={() => setAddProblemModal(true)} 
              className="bg-red-600" 
              data-testid="driver-add-problem"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Report Problem
            </Button>
          </div>

          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Step {step} of 3</CardTitle>
                <div className="flex gap-2">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`w-8 h-2 rounded-full ${s <= step ? 'bg-blue-900' : 'bg-slate-200'}`}
                    />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 1 && (
                <div>
                  <Label>Select Bus</Label>
                  <Select value={selectedBus} onValueChange={setSelectedBus}>
                    <SelectTrigger data-testid="bus-select">
                      <SelectValue placeholder="Choose a bus" />
                    </SelectTrigger>
                    <SelectContent>
                      {buses.map((bus) => (
                        <SelectItem key={bus.bus_id} value={bus.bus_id}>
                          {bus.bus_number} - {bus.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  {checklist.map((question) => (
                    <Card key={question.question_id} className="border-slate-200">
                      <CardContent className="pt-6">
                        <Label className="text-base font-semibold mb-3 block">
                          {question.question_text}
                        </Label>

                        {question.question_type === 'PASS_FAIL' && (
                          <div className="flex gap-3">
                            <Button
                              type="button"
                              variant={answers[question.question_id]?.answer === 'Pass' ? 'default' : 'outline'}
                              className={answers[question.question_id]?.answer === 'Pass' ? 'bg-green-600' : ''}
                              onClick={() => handleAnswerChange(question.question_id, 'Pass')}
                              data-testid={`pass-${question.question_id}`}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Pass
                            </Button>
                            <Button
                              type="button"
                              variant={answers[question.question_id]?.answer === 'Fail' ? 'default' : 'outline'}
                              className={answers[question.question_id]?.answer === 'Fail' ? 'bg-red-600' : ''}
                              onClick={() => handleAnswerChange(question.question_id, 'Fail')}
                              data-testid={`fail-${question.question_id}`}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Fail
                            </Button>
                          </div>
                        )}

                        {question.question_type === 'NUMERIC' && (
                          <Input
                            type="number"
                            placeholder="Enter value"
                            value={answers[question.question_id]?.answer || ''}
                            onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
                            data-testid={`numeric-${question.question_id}`}
                          />
                        )}

                        {question.question_type === 'ODO' && (
                          <Input
                            type="number"
                            placeholder="Enter odometer reading"
                            value={answers[question.question_id]?.answer || ''}
                            onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
                            data-testid={`odo-${question.question_id}`}
                          />
                        )}

                        {question.question_type === 'TEXT' && (
                          <Textarea
                            placeholder="Enter details"
                            value={answers[question.question_id]?.answer || ''}
                            onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
                            data-testid={`text-${question.question_id}`}
                          />
                        )}

                        {answers[question.question_id]?.answer === 'Fail' && question.question_type !== 'ODO' && (
                          <div className="mt-4 space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div>
                              <Label className="text-red-900">Comment (Required)</Label>
                              <Textarea
                                placeholder="Explain the issue"
                                value={answers[question.question_id]?.comment || ''}
                                onChange={(e) => handleCommentChange(question.question_id, e.target.value)}
                                required
                                data-testid={`comment-${question.question_id}`}
                              />
                            </div>
                            
                            {/* Image Capture */}
                            <div>
                              <Label className="text-red-900 flex items-center gap-2">
                                <Camera className="w-4 h-4" /> Capture Image
                              </Label>
                              <Input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => handleImageUpload(question.question_id, e.target.files[0])}
                                data-testid={`image-${question.question_id}`}
                              />
                              {answers[question.question_id]?.image_url && (
                                <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                                  <Check className="w-4 h-4" />
                                  Image captured
                                </p>
                              )}
                            </div>
                            
                            {/* Audio Recording */}
                            <div>
                              <Label className="text-red-900 flex items-center gap-2">
                                <Mic className="w-4 h-4" /> Record Audio
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={audioRecording === question.question_id ? "destructive" : "outline"}
                                  onClick={() => {
                                    if (audioRecording === question.question_id) {
                                      stopQuestionAudioRecording();
                                    } else {
                                      startQuestionAudioRecording(question.question_id);
                                    }
                                  }}
                                  data-testid={`audio-btn-${question.question_id}`}
                                >
                                  {audioRecording === question.question_id ? (
                                    <><Square className="w-4 h-4 mr-1" /> Stop</>
                                  ) : (
                                    <><Circle className="w-4 h-4 mr-1 text-red-600" /> Record</>
                                  )}
                                </Button>
                                {answers[question.question_id]?.audio_url && (
                                  <span className="text-sm text-green-600 flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Audio recorded
                                  </span>
                                )}
                              </div>
                              {answers[question.question_id]?.audio_url && (
                                <audio src={answers[question.question_id].audio_url} controls className="mt-2 w-full h-8" />
                              )}
                            </div>
                            
                            {/* Video Recording */}
                            <div>
                              <Label className="text-red-900 flex items-center gap-2">
                                <Video className="w-4 h-4" /> Record Video
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={videoRecording === question.question_id ? "destructive" : "outline"}
                                  onClick={() => {
                                    if (videoRecording === question.question_id) {
                                      stopQuestionVideoRecording();
                                    } else {
                                      startQuestionVideoRecording(question.question_id);
                                    }
                                  }}
                                  data-testid={`video-btn-${question.question_id}`}
                                >
                                  {videoRecording === question.question_id ? (
                                    <><Square className="w-4 h-4 mr-1" /> Stop</>
                                  ) : (
                                    <><Circle className="w-4 h-4 mr-1 text-red-600" /> Record</>
                                  )}
                                </Button>
                                {answers[question.question_id]?.video_url && (
                                  <span className="text-sm text-green-600 flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Video recorded
                                  </span>
                                )}
                              </div>
                              {answers[question.question_id]?.video_url && (
                                <video src={answers[question.question_id].video_url} controls className="mt-2 w-full max-h-32 rounded" />
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Review Your Inspection</h3>
                  <div className="space-y-2">
                    <p><strong>Bus:</strong> {buses.find((b) => b.bus_id === selectedBus)?.bus_number}</p>
                    <p><strong>Total Questions:</strong> {checklist.length}</p>
                    <p><strong>Failed Items:</strong> {Object.values(answers).filter((a) => a.answer === 'Fail').length}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1}
                  data-testid="prev-step-button"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {step < 3 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && !selectedBus}
                    className="bg-blue-900"
                    data-testid="next-step-button"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-blue-900"
                    data-testid="submit-inspection-button"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Inspection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Inspections */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">My Inspections</h2>
            <div className="space-y-3">
              {inspections.slice(0, 5).map((inspection) => (
                <Card key={inspection.inspection_id} className="border-slate-200">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{inspection.bus_number}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(inspection.inspection_date), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                      {getStatusBadge(inspection.inspection_status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Supervisor View - Inspection Management
  return (
    <Layout>
      <div data-testid="supervisor-inspection-view">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Inspections</h1>
          <Button onClick={() => setAddProblemModal(true)} className="bg-red-600 hover:bg-red-700" data-testid="add-problem-button">
            <Plus className="w-4 h-4 mr-2" />
            Add Problem
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-slate-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm">Bus</Label>
                <Select value={selectedBusFilter} onValueChange={setSelectedBusFilter}>
                  <SelectTrigger data-testid="bus-filter" className="h-9 sm:h-10">
                    <SelectValue placeholder="All buses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All buses</SelectItem>
                    {buses.map((bus) => (
                      <SelectItem key={bus.bus_id} value={bus.bus_id}>
                        {bus.bus_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs sm:text-sm">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="start-date-filter"
                  className="h-9 sm:h-10"
                />
              </div>

              <div>
                <Label className="text-xs sm:text-sm">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="end-date-filter"
                  className="h-9 sm:h-10"
                />
              </div>

              <div>
                <Label className="text-xs sm:text-sm">Quick Filter</Label>
                <Select value={weekFilter} onValueChange={(value) => {
                  setWeekFilter(value);
                  const today = new Date();
                  if (value === 'today') {
                    setStartDate(format(today, 'yyyy-MM-dd'));
                    setEndDate(format(today, 'yyyy-MM-dd'));
                  } else if (value === 'week') {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    setStartDate(format(weekAgo, 'yyyy-MM-dd'));
                    setEndDate(format(today, 'yyyy-MM-dd'));
                  } else if (value === 'month') {
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(today.getMonth() - 1);
                    setStartDate(format(monthAgo, 'yyyy-MM-dd'));
                    setEndDate(format(today, 'yyyy-MM-dd'));
                  }
                }}>
                  <SelectTrigger data-testid="quick-filter" className="h-9 sm:h-10">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
            <TabsTrigger value="assigned" data-testid="tab-assigned">Assigned</TabsTrigger>
            <TabsTrigger value="in-progress" data-testid="tab-in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved" data-testid="tab-resolved">Resolved</TabsTrigger>
            <TabsTrigger value="verified" data-testid="tab-verified">Verified</TabsTrigger>
          </TabsList>

          {['pending', 'assigned', 'in-progress', 'resolved', 'verified'].map((status) => (
            <TabsContent key={status} value={status}>
              <div className="grid gap-4">
                {inspections
                  .filter((i) => {
                    // Status filter
                    let statusMatch = false;
                    if (status === 'pending') statusMatch = i.inspection_status === 'FAILED';
                    else if (status === 'assigned') statusMatch = i.inspection_status === 'ASSIGNED';
                    else if (status === 'in-progress') statusMatch = i.inspection_status === 'IN_PROGRESS';
                    else if (status === 'resolved') statusMatch = i.inspection_status === 'RESOLVED';
                    else if (status === 'verified') statusMatch = i.inspection_status === 'FIXED';

                    // Bus filter
                    const busMatch = selectedBusFilter === 'all' || i.bus_id === selectedBusFilter;

                    // Date filter
                    let dateMatch = true;
                    if (startDate || endDate) {
                      const inspectionDate = new Date(i.inspection_date).toISOString().split('T')[0];
                      if (startDate && inspectionDate < startDate) dateMatch = false;
                      if (endDate && inspectionDate > endDate) dateMatch = false;
                    }

                    return statusMatch && busMatch && dateMatch;
                  })
                  .map((inspection) => (
                    <Card key={inspection.inspection_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="py-3 sm:py-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                              <p className="font-bold text-base sm:text-lg text-slate-900">{inspection.bus_number}</p>
                              {getStatusBadge(inspection.inspection_status)}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600">
                              Driver: {inspection.driver_name} | {format(new Date(inspection.inspection_date), 'dd MMM yyyy, hh:mm a')}
                            </p>
                            {inspection.mechanic_name && (
                              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                                Mechanic: {inspection.mechanic_name}
                              </p>
                            )}
                            <p className="text-xs sm:text-sm text-red-600 font-semibold mt-2">
                              {inspection.details?.filter((d) => d.answer === 'Fail' && d.question_type !== 'ODO').length} issues found
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            {/* View button - always visible */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewInspection(inspection.inspection_id)}
                              className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                              data-testid={`view-inspection-${inspection.inspection_id}`}
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              View
                            </Button>
                            {inspection.inspection_status === 'FAILED' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedInspection(inspection);
                                  setAssignModal(true);
                                }}
                                className="bg-blue-900 w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                                data-testid={`assign-mechanic-${inspection.inspection_id}`}
                              >
                                <Wrench className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Assign Mechanic
                              </Button>
                            )}
                            {inspection.inspection_status === 'RESOLVED' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleVerify(inspection.inspection_id, 'VERIFY')}
                                  className="bg-green-600 w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                                  data-testid={`verify-${inspection.inspection_id}`}
                                >
                                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                  Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleVerify(inspection.inspection_id, 'REASSIGN')}
                                  className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                                  data-testid={`reassign-${inspection.inspection_id}`}
                                >
                                  Reassign
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Assign Mechanic Modal */}
        <Dialog open={assignModal} onOpenChange={setAssignModal}>
          <DialogContent data-testid="assign-mechanic-modal">
            <DialogHeader>
              <DialogTitle>Assign Mechanic</DialogTitle>
              <DialogDescription>Select a mechanic to fix the issues</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Mechanic</Label>
                <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
                  <SelectTrigger data-testid="mechanic-select">
                    <SelectValue placeholder="Select mechanic" />
                  </SelectTrigger>
                  <SelectContent>
                    {mechanics.map((mechanic) => (
                      <SelectItem key={mechanic.user_id} value={mechanic.user_id}>
                        {mechanic.name} ({mechanic.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignMechanic} className="bg-blue-900" data-testid="confirm-assign-button">
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Problem Modal */}
        <Dialog open={addProblemModal} onOpenChange={setAddProblemModal}>
          <DialogContent data-testid="add-problem-modal" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('add_problem')}</DialogTitle>
              <DialogDescription>Report a custom problem found during inspection</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>{t('select_bus')} *</Label>
                <Select value={problemData.bus_id} onValueChange={(value) => setProblemData({ ...problemData, bus_id: value })}>
                  <SelectTrigger data-testid="problem-bus-select">
                    <SelectValue placeholder={t('select_bus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {buses.map((bus) => (
                      <SelectItem key={bus.bus_id} value={bus.bus_id}>
                        {bus.bus_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('problem_description')} *</Label>
                <Textarea
                  placeholder="Describe the problem found..."
                  value={problemData.problem_description}
                  onChange={(e) => setProblemData({ ...problemData, problem_description: e.target.value })}
                  rows={4}
                  data-testid="problem-description"
                />
              </div>

              {/* Image Capture */}
              <div>
                <Label className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {t('take_photo')}
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleProblemImageUpload(e.target.files[0])}
                  data-testid="problem-image"
                  className="mt-2"
                />
                {problemData.image_url && (
                  <div className="mt-2 flex items-center gap-2 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Image captured</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Audio Recording */}
                <div className="p-4 border rounded-lg bg-slate-50">
                  <Label className="flex items-center gap-2 mb-3">
                    <Mic className="w-4 h-4" />
                    {t('record_audio')}
                  </Label>
                  <Button
                    type="button"
                    variant={isRecordingAudio ? 'destructive' : 'outline'}
                    className="w-full"
                    onClick={handleAudioToggle}
                    data-testid="record-audio-button"
                  >
                    {isRecordingAudio ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        {t('stop_recording')}
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 mr-2 text-red-500" />
                        {t('record_audio')}
                      </>
                    )}
                  </Button>
                  {audioStatus === 'recording' && (
                    <p className="text-sm text-red-600 mt-2 animate-pulse">Recording...</p>
                  )}
                  {audioBlobUrl && audioStatus === 'stopped' && (
                    <div className="mt-2">
                      <audio src={audioBlobUrl} controls className="w-full h-10" />
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Audio recorded
                      </p>
                    </div>
                  )}
                </div>

                {/* Video Recording */}
                <div className="p-4 border rounded-lg bg-slate-50">
                  <Label className="flex items-center gap-2 mb-3">
                    <Video className="w-4 h-4" />
                    {t('record_video')}
                  </Label>
                  <Button
                    type="button"
                    variant={isRecordingVideo ? 'destructive' : 'outline'}
                    className="w-full"
                    onClick={handleVideoToggle}
                    data-testid="record-video-button"
                  >
                    {isRecordingVideo ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        {t('stop_recording')}
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 mr-2 text-red-500" />
                        {t('record_video')}
                      </>
                    )}
                  </Button>
                  {videoStatus === 'recording' && (
                    <p className="text-sm text-red-600 mt-2 animate-pulse">Recording...</p>
                  )}
                  {videoBlobUrl && videoStatus === 'stopped' && (
                    <div className="mt-2">
                      <video src={videoBlobUrl} controls className="w-full h-24 rounded" />
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Video recorded
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setAddProblemModal(false);
                setProblemData({ bus_id: '', problem_description: '', image_url: '', audio_url: '', video_url: '' });
              }}>
                {t('cancel')}
              </Button>
              <Button onClick={handleAddProblem} disabled={loading} className="bg-red-600" data-testid="confirm-add-problem">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('add_problem')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Inspection Modal */}
        <Dialog open={viewModal} onOpenChange={setViewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="view-inspection-modal">
            <DialogHeader>
              <DialogTitle className="text-xl">Inspection Details</DialogTitle>
              {viewInspectionData && (
                <DialogDescription>
                  Bus: {viewInspectionData.bus_number} | Driver: {viewInspectionData.driver_name} | 
                  Date: {format(new Date(viewInspectionData.inspection_date), 'dd MMM yyyy, hh:mm a')}
                </DialogDescription>
              )}
            </DialogHeader>

            {viewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Loading inspection details...</span>
              </div>
            ) : viewInspectionData ? (
              <div className="space-y-4">
                {/* Inspection Summary */}
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Status</p>
                      <p className="font-semibold">{getStatusBadge(viewInspectionData.inspection_status)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Driver</p>
                      <p className="font-semibold">{viewInspectionData.driver_name}</p>
                    </div>
                    {viewInspectionData.mechanic_name && (
                      <div>
                        <p className="text-slate-500">Assigned Mechanic</p>
                        <p className="font-semibold">{viewInspectionData.mechanic_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-500">Total Issues</p>
                      <p className="font-semibold text-red-600">
                        {viewInspectionData.details?.filter((d) => d.answer === 'Fail' && d.question_type !== 'ODO').length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inspection Questions & Answers */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900">Checklist Responses</h3>
                  {viewInspectionData.details?.map((detail, index) => (
                    <Card key={detail.detail_id || index} className={`border ${detail.answer === 'Fail' ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                      <CardContent className="py-3">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{index + 1}. {detail.question_text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${detail.answer === 'Fail' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} text-xs`}>
                                {detail.answer}
                              </Badge>
                              <span className="text-xs text-slate-500">({detail.question_type})</span>
                            </div>
                            {detail.comment && (
                              <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded border">
                                <strong>Comment:</strong> {detail.comment}
                              </p>
                            )}
                            {detail.status === 'FIXED' && (
                              <p className="text-sm text-green-600 mt-1">
                                ✓ Fixed {detail.fix_notes && `- ${detail.fix_notes}`}
                              </p>
                            )}
                          </div>
                          
                          {/* Media Section */}
                          <div className="flex flex-wrap gap-2">
                            {detail.image_url && (
                              <div className="relative">
                                <img 
                                  src={detail.image_url} 
                                  alt="Inspection" 
                                  className="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(detail.image_url, '_blank')}
                                />
                                <Badge className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs">
                                  <Image className="w-3 h-3" />
                                </Badge>
                              </div>
                            )}
                            {detail.audio_url && (
                              <div className="bg-slate-100 p-2 rounded border">
                                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                  <Volume2 className="w-3 h-3" /> Audio
                                </p>
                                <audio src={detail.audio_url} controls className="h-8 w-32" />
                              </div>
                            )}
                            {detail.video_url && (
                              <div className="bg-slate-100 p-2 rounded border">
                                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                  <Video className="w-3 h-3" /> Video
                                </p>
                                <video src={detail.video_url} controls className="h-20 w-32 rounded" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 py-8 text-center">No data available</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default InspectionPage;
