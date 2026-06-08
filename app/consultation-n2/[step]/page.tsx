import { notFound } from 'next/navigation'
import { consultationSteps } from '@/lib/consultation-config'
import { ConsultationContainer } from '@/components/consultation/ConsultationContainer'
import { AccueilStep }    from '@/components/consultation/steps/AccueilStep'
import { ScenariosStep }  from '@/components/consultation/steps/ScenariosStep'
import { FeelingStep }    from '@/components/consultation/steps/FeelingStep'
import { DirectionStep }  from '@/components/consultation/steps/DirectionStep'
import { PrioritiesStep } from '@/components/consultation/steps/PrioritiesStep'
import { ArgumentsStep }  from '@/components/consultation/steps/ArgumentsStep'

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  'accueil':   AccueilStep,
  'scenarios': ScenariosStep,
  'ressenti':  FeelingStep,
  'direction': DirectionStep,
  'priorites': PrioritiesStep,
  'arguments': ArgumentsStep,
}

type Props = { params: Promise<{ step: string }> }

export function generateStaticParams() {
  return consultationSteps.map((s) => ({ step: s }))
}

export default async function ConsultationStepPage({ params }: Props) {
  const { step } = await params
  const StepComponent = STEP_COMPONENTS[step]
  if (!StepComponent) notFound()
  return (
    <ConsultationContainer stepId={step}>
      <StepComponent />
    </ConsultationContainer>
  )
}
