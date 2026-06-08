import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Phone, Mail, MoreVertical, Users } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import PersonAvatar from '../components/shared/PersonAvatar';
import EmptyState from '../components/shared/EmptyState';
import SkeletonCard from '../components/shared/SkeletonCard';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import PersonForm from '../components/persons/PersonForm';
import { usePersons } from '../hooks/usePersons';
import { usePersonsStore } from '../stores/personsStore';
import { useTransactionsStore } from '../stores/transactionsStore';
import { formatINR } from '../lib/utils';
import type { Person } from '../types';
import { toast } from 'sonner';

export default function PersonsPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const { isLoading } = usePersonsStore();
  const { persons, removePerson } = usePersons();
  const { transactions } = useTransactionsStore();
  const navigate = useNavigate();

  const filtered = persons.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  function getNetBalance(personId: string) {
    const active = transactions.filter(t => t.personId === personId && t.status === 'active');
    const borrowed = active.filter(t => t.type === 'borrow').reduce((s, t) => s + t.currentPrincipal, 0);
    const lent = active.filter(t => t.type === 'lend').reduce((s, t) => s + t.currentPrincipal, 0);
    return { borrowed, lent };
  }

  return (
    <div>
      <TopBar
        title="Persons"
        right={
          <button
            onClick={() => { setEditPerson(null); setFormOpen(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search persons…"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {isLoading ? (
          <SkeletonCard count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'No persons found' : 'No persons yet'}
            description={search ? 'Try a different search' : 'Add your first person to track transactions with them.'}
            action={!search ? (
              <button
                onClick={() => setFormOpen(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Add Person
              </button>
            ) : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(person => {
              const { borrowed, lent } = getNetBalance(person.id);
              return (
                <div
                  key={person.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/persons/${person.id}`)}
                >
                  <PersonAvatar name={person.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{person.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {person.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={10} />{person.phone}</span>}
                      {person.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail size={10} />{person.email}</span>}
                    </div>
                    {(borrowed > 0 || lent > 0) && (
                      <div className="flex gap-3 mt-1">
                        {borrowed > 0 && <span className="text-xs text-red-500">Borrowed: {formatINR(borrowed)}</span>}
                        {lent > 0 && <span className="text-xs text-green-600">Lent: {formatINR(lent)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); setEditPerson(person); setFormOpen(true); }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditPerson(null); setFormOpen(true); }}
        className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg text-white hover:bg-primary/90 transition-colors lg:bottom-6"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <Plus size={24} />
      </button>

      <PersonForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditPerson(null); }}
        person={editPerson}
        onDelete={editPerson ? async () => {
          await removePerson(editPerson.id);
          toast.success('Person deleted');
          setFormOpen(false);
          setEditPerson(null);
        } : undefined}
      />
    </div>
  );
}
