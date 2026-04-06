import { StepIndicatore } from '@/components/wizard/StepIndicatore'
import { StepRiferimenti } from '@/components/wizard/StepRiferimenti'

export default function RiferimentiPage() {
  return (
    <div>
      <StepIndicatore stepCorrente={3} />
      <StepRiferimenti />
    </div>
  )
}
