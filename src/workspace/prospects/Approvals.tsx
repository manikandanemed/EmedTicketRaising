import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { EmptyState, ErrorState, Loading, formatDateTime, useLoad } from '../ui';
import { useMe } from '../session';
import { ApprovalItem, pApi } from './prospectApi';
import { refreshBadge, useProspectAccess } from './access';
import { EmptyTeamsBanner } from './ProspectParts';
import MailReviewDialog from './MailReviewDialog';
import { StatusBadge, statusTone } from './status';

export default function Approvals() {
  const { me, loaded, unavailable } = useProspectAccess();
  const { isPM } = useMe();
  if (!loaded) return <Loading />;
  if (unavailable || !me || !(me.isMarketing || me.teams.length > 0 || isPM)) return <Navigate to="/workspace" replace />;
  return <ApprovalsPage isMarketing={me.isMarketing} isReviewer={me.teams.length > 0} />;
}

const ItemCard: React.FC<{ item: ApprovalItem; action: string; onOpen: () => void }> = ({ item, action, onOpen }) => (
  <li className={`pr-item pr-item-${statusTone(item.status)}`}>
    <div className="pr-item-main">
      <strong>{item.organisation}</strong>
      <span>{item.subject}</span>
      {item.reviewerComment && <span className="pr-item-comment">“{item.reviewerComment}”</span>}
    </div>
    <div className="pr-item-meta">
      <StatusBadge status={item.status} />
      <span className="ws-muted ws-small">{item.team}{item.round > 1 && ` · round ${item.round}`}</span>
      {item.lastActionAt && <span className="ws-muted ws-small">{formatDateTime(item.lastActionAt)}</span>}
    </div>
    <button className="btn btn-secondary" onClick={onOpen}>{action}</button>
  </li>
);

function ApprovalsPage({ isMarketing, isReviewer }: { isMarketing: boolean; isReviewer: boolean }) {
  const inbox = useLoad(() => (isReviewer ? pApi.inbox() : Promise.resolve(null)), [isReviewer]);
  const sent = useLoad(() => (isMarketing ? pApi.sent() : Promise.resolve(null)), [isMarketing]);
  const [open, setOpen] = useState<number | null>(null);

  const onChanged = () => { inbox.reload(); sent.reload(); refreshBadge(); };
  const waiting = inbox.data?.waiting ?? [];
  const answered = inbox.data?.answered ?? [];

  return (
    <div className="pr-page">
      <div className="ws-title-row">
        <div>
          <h1>{isReviewer ? 'Approval inbox' : 'Sent for approval'}</h1>
          <p className="ws-muted">{isReviewer ? 'Prospect emails your team has been asked to check.' : 'Emails you sent to a review team, and what they said.'}</p>
        </div>
      </div>

      <EmptyTeamsBanner />

      {!isReviewer && !isMarketing && <EmptyState title="Nothing to review here" text="Product Managers can read every prospect email on the Prospect emails page." />}

      {isReviewer && (
        inbox.loading ? <Loading label="Loading inbox..." />
          : inbox.error ? <ErrorState error={inbox.error} onRetry={inbox.reload} />
          : (
            <>
              <h3>Waiting for you ({waiting.length})</h3>
              {waiting.length === 0
                ? <EmptyState icon={<CheckCheck size={26} />} title="You’re all caught up." />
                : <ul className="pr-items">{waiting.map(i => <ItemCard key={i.rowId} item={i} action="Review mail" onOpen={() => setOpen(i.rowId)} />)}</ul>}
              <h3 className="pr-section-gap">Answered</h3>
              {answered.length === 0
                ? <p className="ws-muted">Nothing answered yet.</p>
                : <ul className="pr-items">{answered.map(i => <ItemCard key={i.rowId} item={i} action="Review mail" onOpen={() => setOpen(i.rowId)} />)}</ul>}
            </>
          )
      )}

      {isMarketing && (
        <>
          {isReviewer && <h3 className="pr-section-gap">Sent for approval</h3>}
          {sent.loading ? <Loading label="Loading..." />
            : sent.error ? <ErrorState error={sent.error} onRetry={sent.reload} />
            : (sent.data ?? []).length === 0
              ? <EmptyState title="Nothing sent yet" text="Send a prospect email for approval and it will show up here." />
              : <ul className="pr-items">{sent.data!.map(i => <ItemCard key={i.rowId} item={i} action="Open mail" onOpen={() => setOpen(i.rowId)} />)}</ul>}
        </>
      )}

      {open !== null && <MailReviewDialog rowId={open} onClose={() => setOpen(null)} onChanged={onChanged} />}
    </div>
  );
}
