import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createFeedback, uploadImage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bus, MessageSquare, Send, Loader2 } from 'lucide-react';

const PublicFeedbackPage = () => {
  const [searchParams] = useSearchParams();
  const busId = searchParams.get('bus_id');
  const clientId = searchParams.get('client_id');

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bus_id: busId || '',
    description: '',
    image_url: '',
    want_update: false,
    email: '',
  });

  const handleImageUpload = async (file) => {
    try {
      const response = await uploadImage(file);
      setFormData({ ...formData, image_url: response.data.data.url });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Image upload failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error('Please describe the problem');
      return;
    }

    if (formData.want_update && !formData.email) {
      toast.error('Email is required for updates');
      return;
    }

    setLoading(true);
    try {
      await createFeedback({
        ...formData,
        bus_id: formData.bus_id || busId,
        client_id: clientId,
      });

      toast.success('Feedback submitted successfully! Thank you.');
      
      // Reset form
      setFormData({
        bus_id: busId || '',
        description: '',
        image_url: '',
        want_update: false,
        email: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-900 rounded-2xl mb-4 shadow-lg">
            <MessageSquare className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Passenger Feedback</h1>
          <p className="text-slate-600 font-medium">Report issues or complaints</p>
        </div>

        <Card className="border-slate-200 shadow-md" data-testid="feedback-form">
          <CardHeader>
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>Help us improve our service</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Problem Description *</Label>
                <Textarea
                  placeholder="Describe the issue..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  data-testid="description-input"
                />
              </div>

              <div>
                <Label>Upload Image (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files[0])}
                  data-testid="image-input"
                />
                {formData.image_url && (
                  <p className="text-sm text-green-600 mt-2">Image uploaded successfully</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.want_update}
                    onChange={(e) => setFormData({ ...formData, want_update: e.target.checked })}
                    className="w-4 h-4"
                    data-testid="want-update-checkbox"
                  />
                  <span className="text-sm text-slate-700">I want to receive updates when this is resolved</span>
                </label>

                {formData.want_update && (
                  <div>
                    <Label>Your Email *</Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required={formData.want_update}
                      data-testid="email-input"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800"
                disabled={loading}
                data-testid="submit-feedback-button"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Feedback
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicFeedbackPage;
