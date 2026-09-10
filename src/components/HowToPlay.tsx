import { useId, useRef } from 'react';
import { CircleHelp, X } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

export function HowToPlay() {
  const dialog = useRef<HTMLDialogElement>(null);
  const wasPaused = useRef(true);
  const headingId = useId();

  return (
    <>
      <button
        className="restart-career"
        onClick={() => {
          const store = useGameStore.getState();
          wasPaused.current = store.session.paused;
          store.setPaused(true);
          dialog.current?.showModal();
        }}
      >
        <CircleHelp size={17} /> How to Play
      </button>
      <dialog
        ref={dialog}
        className="how-to-play"
        aria-labelledby={headingId}
        onClose={() => useGameStore.getState().setPaused(wasPaused.current)}
      >
        <div className="dialog-heading">
          <h2 id={headingId}>How to Play</h2>
          <button
            className="icon-button"
            aria-label="Close how to play"
            onClick={() => dialog.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        <p>
          Your appointment lasts 20 business weeks: 20 minutes at normal speed.
          Keep the company functioning and the board on side. Delegating
          responsibility does not delegate the consequences.
        </p>
        <h3>Your goals</h3>
        <p>
          Grow turnover while balancing accountability, board approval, customer
          satisfaction and the health of your teams. Watch the Board and Reports
          for results: a popular decision is not always a good business
          decision.
        </p>
        <h3>Read, decide, follow through</h3>
        <ul>
          <li>
            <strong>Mail:</strong> Open requests in Awaiting approval. Read the
            trade-offs, then choose an action or delegate. Countdown timers are
            deadlines; missed requests can escalate.
          </li>
          <li>
            <strong>Chat:</strong> Respond to employee concerns and follow
            leadership conversations. Complaints need decisions too, and
            ignoring them can have consequences.
          </li>
          <li>
            <strong>Teams:</strong> Set a team mandate and monitor workload,
            performance and trust. Teams work independently; intervene when they
            struggle. Select a member to open their profile.
          </li>
          <li>
            <strong>People:</strong> Review staff, hire, transfer and retain
            employees. Watch joiners, notice periods and departures across both
            offices. Personnel actions are limited each week.
          </li>
        </ul>
        <h3>Make your choices count</h3>
        <p>
          Quick decisions improve the speed contribution to your score; slower
          decisions reduce it. Speed is not everything: costs, overloaded teams
          and delayed consequences can undo short-term gains. Check back on
          delegated work and earlier decisions as pressure builds.
        </p>
        <h3>Take a breather</h3>
        <p>
          Start shift begins the clock. Pause freezes deadlines; 2x and 4x make
          time pass faster. The logo returns to the splash screen and pauses
          play. Restart Career replaces your current run but keeps completed
          scores. Progress saves in this browser only.
        </p>
        <p className="help-pause-note">
          The clock is paused while this guide is open. Closing it restores your
          previous pause state.
        </p>
        <div className="dialog-actions">
          <button className="primary" onClick={() => dialog.current?.close()}>
            Got it
          </button>
        </div>
      </dialog>
    </>
  );
}
