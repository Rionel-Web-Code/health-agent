'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/context';
import { writeAuditEntry } from '@/lib/security/audit-log';
import { createContract, updateContract } from '@/lib/mock-data/contracts';
import type { Contract, ContractType, ContractFormData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, FileText, Building2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ContractFormProps {
  existingContract?: Contract;
  mode?: 'create' | 'edit';
}

const STEPS = [
  { key: 'step1', icon: FileText },
  { key: 'step2', icon: Building2 },
  { key: 'step3', icon: Calendar },
  { key: 'step4', icon: Check },
] as const;

export function ContractForm({ existingContract, mode = 'create' }: ContractFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContractFormData>({
    code: existingContract?.code || '',
    name: existingContract?.name || '',
    epsName: existingContract?.epsName || '',
    ipsName: existingContract?.ipsName || '',
    contractType: existingContract?.contractType || 'capitacion',
    startDate: existingContract?.startDate || '',
    endDate: existingContract?.endDate || '',
    populationCount: existingContract?.populationCount || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof ContractFormData>(
    field: K,
    value: ContractFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!formData.code.trim()) newErrors.code = t('errors.required');
        if (!formData.name.trim()) newErrors.name = t('errors.required');
        if (!formData.contractType) newErrors.contractType = t('errors.required');
        break;
      case 1:
        if (!formData.epsName.trim()) newErrors.epsName = t('errors.required');
        if (!formData.ipsName.trim()) newErrors.ipsName = t('errors.required');
        break;
      case 2:
        if (!formData.startDate) newErrors.startDate = t('errors.required');
        if (!formData.endDate) newErrors.endDate = t('errors.required');
        if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
          newErrors.endDate = t('errors.invalidDate');
        }
        if (!formData.populationCount || formData.populationCount <= 0) {
          newErrors.populationCount = t('errors.required');
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);

    try {
      if (mode === 'edit' && existingContract) {
        updateContract(existingContract.id, {
          ...formData,
          status: existingContract.status,
        });
        writeAuditEntry('DATA_UPDATE', 'contract', `Updated contract ${existingContract.id}`, user?.id || '', user?.name || '', user?.role || '', existingContract.id);
        toast.success(t('contracts.messages.updated'));
      } else {
        createContract({
          ...formData,
          status: 'draft',
          createdBy: user?.id || '1',
        });
        writeAuditEntry('DATA_CREATE', 'contract', `Created contract ${formData.code}`, user?.id || '', user?.name || '', user?.role || '');
        toast.success(t('contracts.messages.created'));
      }
      router.push('/contracts');
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t('contracts.contractCode')} *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value)}
                placeholder="CTR-2024-001"
                className={errors.code ? 'border-destructive' : ''}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">{t('contracts.contractName')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={t('contracts.contractName')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contractType">{t('contracts.contractType')} *</Label>
              <Select
                value={formData.contractType}
                onValueChange={(value: ContractType) => updateField('contractType', value)}
              >
                <SelectTrigger className={errors.contractType ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capitacion">
                    <div className="flex flex-col">
                      <span>{t('contracts.types.capitacion')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('contracts.form.typeCapitacionHelp')}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="evento">
                    <div className="flex flex-col">
                      <span>{t('contracts.types.evento')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('contracts.form.typeEventoHelp')}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mixto">
                    <div className="flex flex-col">
                      <span>{t('contracts.types.mixto')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('contracts.form.typeMixtoHelp')}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.contractType && (
                <p className="text-xs text-destructive">{errors.contractType}</p>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="epsName">{t('contracts.epsName')} *</Label>
              <Input
                id="epsName"
                value={formData.epsName}
                onChange={(e) => updateField('epsName', e.target.value)}
                placeholder="EPS Salud Total"
                className={errors.epsName ? 'border-destructive' : ''}
              />
              {errors.epsName && (
                <p className="text-xs text-destructive">{errors.epsName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('contracts.form.epsHelp')}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ipsName">{t('contracts.ipsName')} *</Label>
              <Input
                id="ipsName"
                value={formData.ipsName}
                onChange={(e) => updateField('ipsName', e.target.value)}
                placeholder="Hospital Regional del Norte"
                className={errors.ipsName ? 'border-destructive' : ''}
              />
              {errors.ipsName && (
                <p className="text-xs text-destructive">{errors.ipsName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('contracts.form.ipsHelp')}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t('contracts.startDate')} *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  className={errors.startDate ? 'border-destructive' : ''}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">{t('contracts.endDate')} *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                  className={errors.endDate ? 'border-destructive' : ''}
                />
                {errors.endDate && (
                  <p className="text-xs text-destructive">{errors.endDate}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="populationCount">{t('contracts.populationCount')} *</Label>
              <Input
                id="populationCount"
                type="number"
                min="0"
                value={formData.populationCount || ''}
                onChange={(e) => updateField('populationCount', parseInt(e.target.value) || 0)}
                placeholder="25000"
                className={errors.populationCount ? 'border-destructive' : ''}
              />
              {errors.populationCount && (
                <p className="text-xs text-destructive">{errors.populationCount}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('contracts.form.populationHelp')}
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-medium">{t('contracts.form.step1')}</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.contractCode')}:</span>
                  <span className="font-medium">{formData.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.contractName')}:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.contractType')}:</span>
                  <span className="font-medium">{t(`contracts.types.${formData.contractType}`)}</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-medium">{t('contracts.form.step2')}</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.epsName')}:</span>
                  <span className="font-medium">{formData.epsName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.ipsName')}:</span>
                  <span className="font-medium">{formData.ipsName}</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-medium">{t('contracts.form.step3')}</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.startDate')}:</span>
                  <span className="font-medium">{formData.startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.endDate')}:</span>
                  <span className="font-medium">{formData.endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('contracts.populationCount')}:</span>
                  <span className="font-medium">{formData.populationCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t(`contracts.form.step${currentStep + 1}`)}
          </span>
          <span className="text-muted-foreground">
            {currentStep + 1} / {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          
          return (
            <div
              key={step.key}
              className={`flex size-10 items-center justify-center rounded-full transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Icon className="size-5" />
            </div>
          );
        })}
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t(`contracts.form.step${currentStep + 1}`)}</CardTitle>
          <CardDescription>
            {currentStep === 0 && t('contracts.form.basicInfo')}
            {currentStep === 1 && t('contracts.form.parties')}
            {currentStep === 2 && t('contracts.form.datesPopulation')}
            {currentStep === 3 && t('contracts.form.review')}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? () => router.push('/contracts') : handlePrevious}
        >
          <ArrowLeft className="mr-2 size-4" />
          {currentStep === 0 ? t('common.cancel') : t('common.previous')}
        </Button>
        
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext}>
            {t('common.next')}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Check className="mr-2 size-4" />
            {isSubmitting ? t('common.loading') : t('common.save')}
          </Button>
        )}
      </div>
    </div>
  );
}
