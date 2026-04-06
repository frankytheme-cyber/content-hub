import { StepIndicatore } from '@/components/wizard/StepIndicatore'
import { StepSito } from '@/components/wizard/StepSito'

export default function WizardPage() {
  return (
    <div>
      <StepIndicatore stepCorrente={1} />
      <StepSito />
    </div>
  )
}
