// ─── screens/operations/SupportTickets/SupportTicketsScreen.js ───────────────
// Status flow: open → in_progress → resolved → closed
// Visibility: it_admin sees all · hospital_admin sees own facility · others see own tickets only
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { PageHeader } from '../../../molecules/PageHeader';
import { EmptyState } from '../../../molecules/EmptyState';
import { useSupportTickets } from '../../../hooks/useSupportTickets';
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR, canRespond } from '../../../constants/support';
import { NewTicketModal }    from './molecules/NewTicketModal';
import { TicketDetailModal } from './molecules/TicketDetailModal';
import { s } from './styles';

export function SupportTicketsScreen({ user, filter: propFilter }) {
  const { C }  = useTheme();
  const st = useSupportTickets(user, propFilter);

  const subtitle =
    user?.role === 'it_admin'       ? 'All facilities — IT Admin view' :
    user?.role === 'hospital_admin' ? 'Your facility tickets' :
    'Raise issues to the IT Admin team';

  const FILTER_BTNS = [
    { id: 'all',      label: 'All' },
    { id: 'mine',     label: 'My tickets' },
    { id: 'open',     label: `Open (${st.openCountByStatus('open')})` },
    { id: 'progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
  ];

  return (
    <ScreenContainer scroll>
      <PageHeader
        title="Support tickets"
        subtitle={subtitle}
        action={<Btn label="+ New ticket" size="sm" onPress={() => st.setNewModal(true)} />}
      />
      {st.loading && <Text style={{ color: C.textMuted, marginBottom: 12 }}>Loading tickets...</Text>}
      {!!st.error && <Text style={{ color: C.danger, marginBottom: 12 }}>{st.error}</Text>}

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {FILTER_BTNS.map(f => (
          <Btn key={f.id} label={f.label}
            variant={st.filter === f.id ? 'primary' : 'ghost'}
            size="sm" onPress={() => st.setFilter(f.id)}
            style={{ marginRight: 8 }} />
        ))}
      </ScrollView>

      {st.filtered.length === 0 && <EmptyState icon="inbox" message="No tickets here" />}

      {st.filtered.map(t => (
        <Card key={t.id} hover onPress={() => st.openDetail(t)} style={s.ticketCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={[s.ticketIcon, { backgroundColor: `${C.primary}14` }]}>
              <Icon name="message-square" lib="feather" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <Text style={[s.ticketTitle, { color: C.text }]} numberOfLines={1}>{t.title}</Text>
              </View>
              <Text style={[s.ticketDesc, { color: C.textSec }]} numberOfLines={2}>{t.description}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge label={STATUS_LABEL[t.status]}   color={STATUS_COLOR[t.status] || 'primary'} />
                <Badge label={t.priority}               color={PRIORITY_COLOR[t.priority] || 'warning'} />
                <Badge label={t.category}               color="primary" />
                <Text style={{ fontSize: 10, color: C.textMuted, flex: 1 }}>by {t.raised_by_name}</Text>
                {(t.responses || []).length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="message-circle" lib="feather" size={11} color={C.textMuted} />
                    <Text style={{ fontSize: 10, color: C.textMuted }}>{t.responses.length}</Text>
                  </View>
                )}
              </View>
            </View>
            <Icon name="chevron-right" lib="feather" size={16} color={C.textMuted} />
          </View>
        </Card>
      ))}

      <NewTicketModal
        visible={st.newModal}
        user={user}
        onClose={() => st.setNewModal(false)}
        onCreate={st.addTicket}
      />
      <TicketDetailModal
        visible={st.detailModal.visible}
        ticket={st.detailModal.ticket}
        user={user}
        onClose={st.closeDetail}
        onUpdate={st.handleUpdate}
      />
    </ScreenContainer>
  );
}
