import { notFound } from 'next/navigation'
import { flowSteps } from '@/lib/flow-config'
import { FlowContainer } from '@/components/flow/FlowContainer'
import { IdentifyStep }        from '@/components/flow/steps/IdentifyStep'
import { SeasonRecapStep }     from '@/components/flow/steps/SeasonRecapStep'
import { LicenseStep }         from '@/components/flow/steps/LicenseStep'
import { IcEngagementStep }    from '@/components/flow/steps/IcEngagementStep'
import { TableauRankingStep }  from '@/components/flow/steps/TableauRankingStep'
import { AvailabilityStep }    from '@/components/flow/steps/AvailabilityStep'
import { MatchFormatStep }     from '@/components/flow/steps/MatchFormatStep'
import { PartnersStep }        from '@/components/flow/steps/PartnersStep'
import { TeamsStep }           from '@/components/flow/steps/TeamsStep'
import { BadmintonManagerStep } from '@/components/flow/steps/BadmintonManagerStep'
import { CalendarStep }        from '@/components/flow/steps/CalendarStep'
import { SummaryStep }         from '@/components/flow/steps/SummaryStep'

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  'identify':           IdentifyStep,
  'season-recap':       SeasonRecapStep,
  'license':            LicenseStep,
  'ic-engagement':      IcEngagementStep,
  'tableau-ranking':    TableauRankingStep,
  'availability':       AvailabilityStep,
  'match-format':       MatchFormatStep,
  'partners':           PartnersStep,
  'teams':              TeamsStep,
  'badminton-manager':  BadmintonManagerStep,
  'calendar':           CalendarStep,
  'summary':            SummaryStep,
}

type Props = {
  params: Promise<{ step: string }>
}

export function generateStaticParams() {
  return flowSteps.map((s) => ({ step: s.id }))
}

export default async function FlowStepPage({ params }: Props) {
  const { step } = await params
  const StepComponent = STEP_COMPONENTS[step]
  if (!StepComponent) notFound()

  return (
    <FlowContainer stepId={step}>
      <StepComponent />
    </FlowContainer>
  )
}
