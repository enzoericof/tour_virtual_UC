CREATE TABLE campus_chat_archive (
    id uuid PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES usuarios(id),
    name varchar(201) NOT NULL,
    text varchar(500) NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
    sent_at bigint NOT NULL
);
CREATE INDEX campus_chat_archive_time ON campus_chat_archive(sent_at DESC, id DESC);

-- Solo se persiste el consentimiento; los mensajes recientes viven en RAM.
CREATE TABLE campus_social_actions (
    id uuid PRIMARY KEY,
    kind varchar(24) NOT NULL CHECK (kind IN ('high-five', 'hold-hands', 'ok', 'peace', 'ragdoll')),
    sender uuid NOT NULL,
    recipient uuid,
    sender_name varchar(201) NOT NULL,
    recipient_name varchar(201),
    sender_pose jsonb NOT NULL,
    recipient_pose jsonb,
    status varchar(16) NOT NULL CHECK (status IN ('pending', 'active', 'declined', 'cancelled', 'expired')),
    started_at bigint NOT NULL,
    expires_at bigint NOT NULL
);
CREATE INDEX campus_social_actions_expiry ON campus_social_actions(expires_at);
