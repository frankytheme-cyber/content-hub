import { StepIndicatore } from '@/components/wizard/StepIndicatore'
import { StepCategoria } from '@/components/wizard/StepCategoria'

export default function CategoriaPage() {
  return (
    <div>
      <StepIndicatore stepCorrente={2} />
      <StepCategoria />
    </div>
  )
}
