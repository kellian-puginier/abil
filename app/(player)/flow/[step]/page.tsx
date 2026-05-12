import { notFound } from 'next/navigation'
import { flowSteps } from '@/lib/flow-config'
import { FlowContainer } from '@/components/flow/FlowContainer'
import { IdentifyStep }        from '@/components/flow/steps/IdentifyStep'
import { SeasonRecapStep }     from '@/components/flow/steps/SeasonRecapStep'
import { LicenseStep }         from '@/components/flow/steps/LicenseStep'
import { IcEngagementStep }    from '@/components/flow/steps/IcEngagementStep'
import { CharterStep }         from '@/components/flow/steps/CharterStep'
import { CaptainStep }         from '@/components/flow/steps/CaptainStep'
import { IcRoleStep }          from '@/components/flow/steps/IcRoleStep'
import { TableauRankingStep }  from '@/components/flow/steps/TableauRankingStep'
import { AvailabilityStep }    from '@/components/flow/steps/AvailabilityStep'
import { PartnersStep }        from '@/components/flow/steps/PartnersStep'
import { TeamsStep }           from '@/components/flow/steps/TeamsStep'
import { TshirtStep }          from '@/components/flow/steps/TshirtStep'
import { FormationsStep }      from '@/components/flow/steps/FormationsStep'
import { BadmintonManagerStep } from '@/components/flow/steps/BadmintonManagerStep'
import { CalendarStep }        from '@/components/flow/steps/CalendarStep'
import { StageRepriseStep }    from '@/components/flow/steps/StageRepriseStep'
import { CohesionStep }        from '@/components/flow/steps/CohesionStep'
import { SummaryStep }         from '@/components/flow/steps/SummaryStep'

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  'identify':          IdentifyStep,
  'season-recap':      SeasonRecapStep,
  'license':           LicenseStep,
  'ic-engagement':     IcEngagementStep,
  'charter':           CharterStep,
  'captain':           CaptainStep,
  'ic-role':           IcRoleStep,
  'tableau-ranking':   TableauRankingStep,
  'availability':      AvailabilityStep,
  'partners':          PartnersStep,
  'teams':             TeamsStep,
  'tshirt':            TshirtStep,
  'formations':        FormationsStep,
  'badminton-manager': BadmintonManagerStep,
  'calendar':          CalendarStep,
  'stage-reprise':     StageRepriseStep,
  'cohesion':          CohesionStep,
  'summary':           SummaryStep,
}

type Props = { params: Promise<{ step: string }> }

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
