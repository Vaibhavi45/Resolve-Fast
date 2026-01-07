'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { complaintsService } from '@/lib/api/services/complaints.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { X, Upload, Loader2 } from 'lucide-react';

export default function NewComplaintPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const isCustomer = user?.role === 'CUSTOMER';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const oversizedFiles = selectedFiles.filter(file => file.size > 500 * 1024);

      if (oversizedFiles.length > 0) {
        alert(`Some files exceed the 500KB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }

      setFiles(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: any) => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      console.log('Submitting complaint with data:', data);
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('category', data.category);

      // For customers: send expected_resolution_days instead of priority
      if (isCustomer) {
        if (data.expected_days) {
          formData.append('expected_resolution_days', data.expected_days.toString());
        }
        // Set default priority (will be calculated on backend)
        formData.append('priority', 'MEDIUM');
      } else {
        // For agents/admins: send priority
        formData.append('priority', data.priority || 'MEDIUM');
      }

      // Add pincode (required for auto-assignment)
      if (data.pincode) {
        formData.append('pincode', data.pincode);
      }

      // Add location if provided
      if (data.location) {
        formData.append('location', data.location);
      }

      // Add service type if product complaint
      if (data.category === 'PRODUCT_QUALITY' && data.service_type) {
        formData.append('service_type_required', data.service_type);
      }

      // Add service delivery type for product complaints
      if (data.category === 'PRODUCT_QUALITY' && data.service_delivery_type) {
        formData.append('service_delivery_type', data.service_delivery_type);
      }

      // Add attachments
      files.forEach((file) => {
        formData.append('attachments', file);
      });

      console.log('Calling complaintsService.create...');
      const response = await complaintsService.create(formData);
      console.log('Complaint created successfully:', response);
      alert(`Complaint created successfully! Number: ${response.complaint_number}`);
      router.push('/complaints');
    } catch (error: any) {
      console.error('Create complaint error:', error);
      console.error('Error response:', error.response);
      const errorMsg = error.response?.data?.detail ||
        error.response?.data?.error ||
        error.message ||
        'Failed to create complaint. Please try again.';
      setError(errorMsg);
      alert('Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 dark:text-white">New Complaint</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">What is this regarding?</p>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold mb-3 dark:text-white">Category</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'PRODUCT_QUALITY', label: 'Product Issue', color: 'bg-[#1da9c3] text-white' },
              { value: 'TECHNICAL', label: 'Technical', color: 'bg-[#1da9c3] text-white' },
              { value: 'SERVICE', label: 'Service', color: 'bg-[#1da9c3] text-white' },
            ].map((cat) => (
              <label key={cat.value} className="cursor-pointer">
                <input
                  type="radio"
                  {...register('category', { required: true })}
                  value={cat.value}
                  className="hidden peer"
                />
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${cat.color} peer-checked:ring-2 peer-checked:ring-blue-600 dark:peer-checked:ring-blue-400`}>
                  {cat.label}
                </span>
              </label>
            ))}
          </div>
          {errors.category && <p className="text-red-500 dark:text-red-400 text-sm mt-1">Category is required</p>}
        </div>

        {isCustomer ? (
          <div>
            <label className="block text-sm font-semibold mb-3 dark:text-white">
              Expected Resolution Time
            </label>
            <div className="space-y-3">
              <div>
                <input
                  type="number"
                  {...register('expected_days', {
                    required: 'Please specify expected resolution time',
                    min: { value: 1, message: 'Minimum 1 day' },
                    max: { value: 30, message: 'Maximum 30 days' }
                  })}
                  min="1"
                  max="30"
                  placeholder="Enter number of days"
                  className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                {errors.expected_days && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                    {errors.expected_days.message as string}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                How many days do you expect this issue to be resolved? (1-30 days)
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold mb-3 dark:text-white">Priority Level</label>
            <div className="flex gap-2">
              {[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Normal' },
                { value: 'HIGH', label: 'Urgent' },
                { value: 'CRITICAL', label: 'Critical' },
              ].map((pri) => (
                <label key={pri.value} className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    {...register('priority', { required: !isCustomer })}
                    value={pri.value}
                    className="hidden peer"
                  />
                  <span className="block text-center px-4 py-2 border-2 dark:border-gray-600 rounded-lg peer-checked:border-blue-600 dark:peer-checked:border-blue-400 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900 dark:text-white">
                    {pri.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-2 dark:text-white">
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            {...register('pincode', { required: 'Pincode is required for service assignment' })}
            type="text"
            maxLength={10}
            className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            placeholder="Enter your pincode (e.g., 400001)"
          />
          {errors.pincode && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {errors.pincode.message as string}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Required for automatic assignment to nearest service agent
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 dark:text-white">Location (Optional)</label>
          <input
            {...register('location')}
            className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            placeholder="City or location where issue occurred"
          />
        </div>

        {watch('category') === 'PRODUCT_QUALITY' && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2 dark:text-white">
                Service Type Required
              </label>
              <input
                {...register('service_type')}
                className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                placeholder="e.g., Electronics, Appliances, Mobile Repair"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Type of service needed for this product issue
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 dark:text-white">
                Service Delivery Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    {...register('service_delivery_type')}
                    value="PICKUP"
                    className="hidden peer"
                  />
                  <div className="border-2 dark:border-gray-600 rounded-lg p-4 text-center peer-checked:border-blue-600 dark:peer-checked:border-blue-400 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 dark:text-white transition-all">
                    <div className="font-semibold mb-1">Agent Pickup</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Agent will collect from your location</div>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    {...register('service_delivery_type')}
                    value="SHOP"
                    className="hidden peer"
                  />
                  <div className="border-2 dark:border-gray-600 rounded-lg p-4 text-center peer-checked:border-blue-600 dark:peer-checked:border-blue-400 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 dark:text-white transition-all">
                    <div className="font-semibold mb-1">Visit Shop</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">You will bring to service center</div>
                  </div>
                </label>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold mb-2 dark:text-white">Subject Line</label>
          <input
            {...register('title', { required: true })}
            className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            placeholder="Brief description of the issue"
          />
          {errors.title && <p className="text-red-500 dark:text-red-400 text-sm mt-1">Subject is required</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 dark:text-white">Description</label>
          <textarea
            {...register('description', { required: true })}
            rows={6}
            className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            placeholder="Detailed description of the issue"
          />
          <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">0/2000</div>
          {errors.description && <p className="text-red-500 dark:text-red-400 text-sm mt-1">Description is required</p>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-semibold dark:text-white">Attachments</label>
            <button
              type="button"
              onClick={() => document.getElementById('file-upload')?.click()}
              className="text-[#1da9c3] text-sm font-medium flex items-center gap-1"
            >
              <Upload size={16} /> Add
            </button>
          </div>

          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-4">
            {files.map((file, index) => (
              <div key={index} className="relative border-2 border-dashed dark:border-gray-600 rounded-lg p-4 flex items-center justify-center dark:bg-gray-700">
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 bg-white dark:bg-gray-600 rounded-full p-1 shadow"
                >
                  <X size={16} className="dark:text-white" />
                </button>
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="max-h-32 object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium dark:text-white">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                )}
              </div>
            ))}

            {files.length === 0 && (
              <div
                onClick={() => document.getElementById('file-upload')?.click()}
                className="border-2 border-dashed dark:border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
              >
                <Upload size={32} className="text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Add Photo</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Max file size 500KB. Formats: JPG, PNG, PDF</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#1da9c3] text-white rounded-lg font-semibold hover:bg-[#178a9f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Submitting...
            </>
          ) : (
            'Submit Complaint ▶'
          )}
        </button>
      </form>
    </div>
  );
}
