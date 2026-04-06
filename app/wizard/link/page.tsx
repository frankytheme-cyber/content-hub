import { StepIndicatore } from '@/components/wizard/StepIndicatore'
import { StepLink } from '@/components/wizard/StepLink'

export default function LinkPage() {
  return (
    <div>
      <StepIndicatore stepCorrente={4} />
      <StepLink />
    </div>
  )
}
