--
-- PostgreSQL database dump
--

\restrict aClrwAA4CV7KGOUi5MSg27wl8RpPyjnH9jUtzLKlVycO4SH2JDE8VcUFCo2MGNO

-- Dumped from database version 16.12 (6d3029c)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: _system; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA _system;


ALTER SCHEMA _system OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: replit_database_migrations_v1; Type: TABLE; Schema: _system; Owner: neondb_owner
--

CREATE TABLE _system.replit_database_migrations_v1 (
    id bigint NOT NULL,
    build_id text NOT NULL,
    deployment_id text NOT NULL,
    statement_count bigint NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE _system.replit_database_migrations_v1 OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE; Schema: _system; Owner: neondb_owner
--

CREATE SEQUENCE _system.replit_database_migrations_v1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE OWNED BY; Schema: _system; Owner: neondb_owner
--

ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNED BY _system.replit_database_migrations_v1.id;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.activity_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    action text NOT NULL,
    details text,
    entity_type text,
    entity_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO neondb_owner;

--
-- Name: daily_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.daily_entries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    timesheet_id character varying NOT NULL,
    date date NOT NULL,
    hours integer DEFAULT 0 NOT NULL,
    activity_log text
);


ALTER TABLE public.daily_entries OWNER TO neondb_owner;

--
-- Name: evaluation_sections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.evaluation_sections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    evaluation_id character varying NOT NULL,
    section_number integer NOT NULL,
    section_name text NOT NULL,
    question text NOT NULL,
    self_rating integer,
    self_documentation text,
    improvement_goal text,
    manager_rating integer,
    manager_feedback text,
    founder_feedback text
);


ALTER TABLE public.evaluation_sections OWNER TO neondb_owner;

--
-- Name: evaluations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.evaluations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ic_id character varying NOT NULL,
    manager_id character varying NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    experience_level_at_eval integer,
    new_experience_level integer,
    overall_self_rating integer,
    overall_manager_rating integer,
    expectations_for_next_review text,
    manager_summary text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    ic_submitted_at timestamp without time zone,
    manager_submitted_at timestamp without time zone,
    completed_at timestamp without time zone,
    overall_score integer,
    outcomes text[]
);


ALTER TABLE public.evaluations OWNER TO neondb_owner;

--
-- Name: feedback_invitations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.feedback_invitations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    evaluation_id character varying NOT NULL,
    invited_by_id character varying NOT NULL,
    invited_user_id character varying NOT NULL,
    feedback text,
    rating integer,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


ALTER TABLE public.feedback_invitations OWNER TO neondb_owner;

--
-- Name: ic_payment_details; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ic_payment_details (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    bank_name text,
    account_holder_first_name text,
    account_holder_last_name text,
    account_number text,
    routing_number text,
    swift_code text,
    iban_number text,
    account_type text,
    address text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ic_payment_details OWNER TO neondb_owner;

--
-- Name: ic_responsibilities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ic_responsibilities (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ic_id character varying NOT NULL,
    responsibility text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ic_responsibilities OWNER TO neondb_owner;

--
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoice_line_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    description text NOT NULL,
    quantity integer NOT NULL,
    rate integer NOT NULL,
    total integer NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.invoice_line_items OWNER TO neondb_owner;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    invoice_number text NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    issue_date date NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    amount integer,
    subtotal integer,
    contractor_name text,
    contractor_address text,
    contractor_phone text,
    contractor_email text,
    contractor_vat_no text,
    bill_to_name text,
    bill_to_address text,
    bill_to_vat_no text,
    bank_details text,
    uploaded_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending_review'::text NOT NULL,
    reviewed_by character varying,
    reviewed_at timestamp without time zone,
    review_note text,
    timesheet_id character varying
);


ALTER TABLE public.invoices OWNER TO neondb_owner;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notification_preferences (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    ooo_notifications boolean DEFAULT true NOT NULL,
    timesheet_notifications boolean DEFAULT true NOT NULL,
    overtime_notifications boolean DEFAULT true NOT NULL,
    invoice_notifications boolean DEFAULT true NOT NULL,
    deadline_reminders boolean DEFAULT true NOT NULL,
    evaluation_notifications boolean DEFAULT true NOT NULL,
    team_action_notifications boolean DEFAULT true NOT NULL
);


ALTER TABLE public.notification_preferences OWNER TO neondb_owner;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    actor_id character varying,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    entity_type text,
    entity_id character varying,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: ooo_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ooo_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    manager_id character varying NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    ooo_type text DEFAULT 'full_day'::text NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by character varying,
    reviewed_at timestamp without time zone,
    review_note text
);


ALTER TABLE public.ooo_requests OWNER TO neondb_owner;

--
-- Name: overtime_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.overtime_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    timesheet_id character varying NOT NULL,
    date date NOT NULL,
    requested_hours integer NOT NULL,
    approved_hours integer,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by character varying,
    reviewed_at timestamp without time zone,
    review_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_weekend_work boolean DEFAULT false NOT NULL
);


ALTER TABLE public.overtime_requests OWNER TO neondb_owner;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    token character varying NOT NULL,
    user_id character varying NOT NULL,
    username text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: timesheets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.timesheets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    total_hours integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_at timestamp without time zone,
    reviewed_by character varying,
    reviewed_at timestamp without time zone,
    review_note text
);


ALTER TABLE public.timesheets OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text DEFAULT 'ic'::text NOT NULL,
    job_title text,
    team text,
    supervisor_id character varying,
    manager_id character varying,
    is_active boolean DEFAULT true NOT NULL,
    avatar_url text,
    experience_level integer DEFAULT 1,
    contractor_status text DEFAULT 'engaged'::text,
    hourly_rate integer,
    monthly_cap integer,
    contractor_category text,
    must_change_password boolean DEFAULT false NOT NULL,
    completed_onboarding jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1 id; Type: DEFAULT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1 ALTER COLUMN id SET DEFAULT nextval('_system.replit_database_migrations_v1_id_seq'::regclass);


--
-- Data for Name: replit_database_migrations_v1; Type: TABLE DATA; Schema: _system; Owner: neondb_owner
--

COPY _system.replit_database_migrations_v1 (id, build_id, deployment_id, statement_count, applied_at) FROM stdin;
1	6bc6ad71-1beb-42aa-9265-4fb0cc664d16	075bd669-ae6d-4d71-872e-0247249ad8a5	2	2026-01-31 12:35:26.966526+00
\.


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.activity_logs (id, user_id, action, details, entity_type, entity_id, created_at) FROM stdin;
57417bd9-a157-45b9-9031-e8b4ef1d6bd4	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-02 23:29:08.37817
082b85e7-0763-414a-be5a-a529b3b8bfb6	be1a274a-663c-45db-952c-bf75d8df53b6	OOO request created	Requested time off from 2026-01-21 to 2026-01-21	ooo_request	2dafd073-d009-46dc-a949-b95174b22590	2026-01-02 23:31:25.524506
157ef67a-50cf-400b-acd9-0e4b8e6df6a7	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-02 23:31:50.752589
30c6b19d-47ad-4338-bb4d-79d66093f21f	82defca1-4380-4327-a959-474de43bf1dc	OOO request approved	Leave request was approved	ooo_request	2dafd073-d009-46dc-a949-b95174b22590	2026-01-02 23:32:29.090881
ae57000d-6efe-4eee-927b-db6bac8f9337	6f3bbf1e-57c9-4914-88e6-390ce48668c1	User logged in	Emily Davis logged in	user	6f3bbf1e-57c9-4914-88e6-390ce48668c1	2026-01-02 23:33:01.329214
d1415891-ec11-4097-955d-1e24e05bebe0	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-02 23:34:23.996375
6b02bf2e-bc6d-4461-9405-cec08096ce23	be1a274a-663c-45db-952c-bf75d8df53b6	OOO request created	Requested time off from 2026-02-10 to 2026-02-12	ooo_request	c659aa80-746e-4332-ab41-7bf81e7d5e5b	2026-01-02 23:39:11.572023
e0e26321-666b-4d4d-a66a-fb7b7398ffd9	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-02 23:39:27.590107
f742ca6e-1dd4-4e2f-a224-0bc1e618266d	82defca1-4380-4327-a959-474de43bf1dc	OOO request rejected	Leave request was rejected	ooo_request	c659aa80-746e-4332-ab41-7bf81e7d5e5b	2026-01-02 23:39:54.620765
087bcc48-9970-43c5-aa95-db1bafaa6285	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-02 23:41:52.135449
68723d52-4b7e-4e1f-9438-e26a5b776e1e	be1a274a-663c-45db-952c-bf75d8df53b6	Timesheet submitted	Submitted timesheet for 1/2026 with 15 hours	timesheet	5a598c91-2a7d-42b1-9025-71a4a6188e75	2026-01-02 23:42:56.245816
8dfe5a06-d3a2-4d07-9cca-5e83bd3e4eeb	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-02 23:43:10.628456
4cc0456a-a336-42bb-ba38-e78ee4ea1d81	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-02 23:50:37.146956
26af5175-045e-47a8-82c7-777ff0a32ab5	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-02 23:51:03.679563
7b170260-9596-426f-95e5-3be85e7a4402	6f3bbf1e-57c9-4914-88e6-390ce48668c1	User logged in	Emily Davis logged in	user	6f3bbf1e-57c9-4914-88e6-390ce48668c1	2026-01-02 23:51:54.308307
5f81ab02-9a45-486f-bb01-c0f32672642b	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-02 23:54:47.972008
a7d1685b-a8d6-4243-9c83-55ac603f5921	be1a274a-663c-45db-952c-bf75d8df53b6	Timesheet submitted	Submitted timesheet for 2/2026 with 8 hours	timesheet	4d3c9749-2a9e-4427-8f63-2cc80b818d16	2026-01-02 23:55:51.749269
caa017f7-016b-49cb-ae3b-82e1172785a9	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-02 23:56:14.469069
1de7d047-54a0-4036-8492-036082770c9e	82defca1-4380-4327-a959-474de43bf1dc	Timesheet submitted	Submitted timesheet for 1/2026 with 8 hours	timesheet	9312931e-be96-4e23-975f-ac9014feb0e7	2026-01-02 23:58:43.735938
8f336b29-d214-45ad-bd31-631b988db2cb	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 00:00:13.31331
daa43f84-4e03-4a54-81d9-acebaf1f5e6d	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 00:01:29.826838
f8487a4e-b1cd-4750-96ef-edbe1d4c3275	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 00:05:09.505214
23640e70-06e8-4f93-901f-b7cc24602b75	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 00:06:12.225405
4db8c45e-f2d2-45d7-9dc3-a1ddc5cd83f7	82defca1-4380-4327-a959-474de43bf1dc	Overtime request approved	Overtime request was approved	overtime_request	3b04974c-41f8-4bc6-adf5-62b854bce5e8	2026-01-03 00:06:37.85139
7a308a2d-7ced-4777-b154-ba4326478665	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 00:07:58.305766
ac752a43-5b37-4285-85c2-5d6b13654a2d	82defca1-4380-4327-a959-474de43bf1dc	Evaluation created	Created performance evaluation for period 2026-01-01 to 2026-03-31	evaluation	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	2026-01-03 00:08:50.1478
c664b05e-1762-402d-bda5-fdbb8ec9c8cb	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 00:09:09.125868
9ee76a11-bcfb-4284-85fd-be2b2170330f	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 00:13:34.31909
20cbb2bd-cb8d-443c-9b12-e930870cb945	82defca1-4380-4327-a959-474de43bf1dc	Evaluation created	Created performance evaluation for period 2026-01-01 to 2026-03-31	evaluation	57d32d60-a72a-47d8-b24c-e6374fa53cfa	2026-01-03 00:14:27.175848
b72b4d3b-56c4-49b8-bdd7-a8e68de9d069	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 00:14:44.234529
88ffd2ef-76e2-4226-87b0-7604340808d1	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 13:40:56.8587
a629807b-163e-47fb-8b0d-5ceb67c16697	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 13:42:02.902137
36ba9c98-bde0-4938-b039-a2a6755f5f35	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 13:55:41.274713
4da27904-4270-4dbb-b967-2620041fed9d	6f3bbf1e-57c9-4914-88e6-390ce48668c1	User logged in	Emily Davis logged in	user	6f3bbf1e-57c9-4914-88e6-390ce48668c1	2026-01-03 13:56:12.088309
d76345d1-98b9-4c9f-918f-ecd396994ccb	6f3bbf1e-57c9-4914-88e6-390ce48668c1	Evaluation created	Created performance evaluation for period 2025-11-01 to 2026-01-02	evaluation	f5c17618-4777-435b-bcb8-5e583d8767e2	2026-01-03 13:58:09.03224
3186f8a0-d5c4-43cb-a515-ea0ead5d29aa	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User created	Created user Malik Kabir	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 13:59:48.206268
6bc113d8-7131-48c3-a27a-af364851f2c9	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 14:00:03.487745
d37b42eb-2eb2-4980-aa47-a41470f519cb	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 14:16:31.791243
5e9e16aa-1ebc-4ead-abee-3afc1b57139b	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 14:18:37.51171
53ca9520-a556-430b-8409-42098d1a9abf	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 14:32:38.31919
892bdf5b-0d14-41f5-9065-77db788effcd	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 14:36:53.20402
4d0a0a3a-fcbe-4bd4-a18d-3e062b80514c	82defca1-4380-4327-a959-474de43bf1dc	Evaluation created	Created performance evaluation for period 2026-01-01 to 2026-01-02	evaluation	804c0257-6160-47a4-9e33-7f7fd272bb79	2026-01-03 14:39:10.629849
8fa87035-c66d-4553-b60e-081b845fbcfb	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 14:41:38.920722
f8e81639-689d-4a36-8bc2-8b3f2ce57a55	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 14:43:40.334367
9fd08800-6ddf-45a0-824e-35377c34c713	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 14:45:04.314817
c3ece892-e317-44c8-b229-2413d1d7f8bd	82defca1-4380-4327-a959-474de43bf1dc	Evaluation completed	Completed performance evaluation for period 2026-01-01 to 2026-01-02	evaluation	804c0257-6160-47a4-9e33-7f7fd272bb79	2026-01-03 14:47:18.033211
121bc3f2-b104-4dbc-a55a-b16f06cd3dd1	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 14:57:38.937522
ed1c7d29-b5cc-4fc6-b2ab-f17566d17c95	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:01:59.529133
6e7d14bf-ca20-4be0-93ed-a63291ea2a5a	82defca1-4380-4327-a959-474de43bf1dc	Evaluation completed	Finalized evaluation for period 2026-01-01 to 2026-03-31	evaluation	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	2026-01-03 15:02:31.923883
f51f3bb5-550f-42e7-994c-ed1c3e7dfc5b	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:02:51.152298
114ef3ca-0ae9-44ea-a7a9-ba6a2af8a350	82defca1-4380-4327-a959-474de43bf1dc	Overtime request rejected	Overtime request was rejected	overtime_request	46c0a88f-507b-4b79-b23e-cc353b7dcd81	2026-01-03 15:08:12.858091
2026028a-634e-444f-82d1-512d055fceeb	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 15:08:27.641514
1c84ffdc-22c0-435f-88a9-6187c6010a82	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 15:16:36.15438
734ebcdc-8994-47ab-b881-acbd0ad84b51	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:17:38.751165
c6c45977-a2e6-4805-aa52-62f05192ff6e	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:26:48.330863
396f821b-3fc8-4c04-a755-baf89e6eee62	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 15:27:19.330855
aef64582-0844-4951-bb97-407373e20c53	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request created	Requested 4 overtime hours for 2026-01-08	overtime_request	b1c200ec-214a-4f01-b496-517e431682be	2026-01-03 15:27:34.669001
19976e1e-9da5-42d9-9908-355fda641d96	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:27:48.23062
d09aa1b2-dd87-4f2b-b113-7f4a281e47b8	82defca1-4380-4327-a959-474de43bf1dc	Overtime request rejected	Overtime request was rejected	overtime_request	b1c200ec-214a-4f01-b496-517e431682be	2026-01-03 15:28:49.400809
22783e8d-34a8-46f3-8bb6-30f9d2142c72	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 15:29:00.285635
35f206b0-d452-43c4-b06c-fdd53f5148fb	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request created	Requested 5 overtime hours for 2026-01-09	overtime_request	28aa2d6c-930a-474e-a743-b69af401171b	2026-01-03 15:30:20.164331
1f6dec02-1cf4-4e36-9b20-a70bd4454cd2	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:30:43.12908
39657875-95ab-4e19-9222-7bda90668ba7	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:34:17.673504
8f39318a-16fc-4252-877f-cc868ef584f5	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 15:35:09.09219
1b9c3303-2be4-495a-948f-3305e6bd8833	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:38:58.652858
bf923f6e-f07a-4a50-bafe-298bd357b3d8	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 15:46:28.312149
e8b5d7da-1b94-41a0-a920-36655fc1526e	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request created	Requested 2 overtime hours for 2026-01-10	overtime_request	04162dc6-53c8-457a-a14a-5f1bb18af6cc	2026-01-03 15:47:05.367701
17c253f7-ebd1-447f-9585-2b9b301d361b	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:47:39.836557
febc0fe2-dff0-4065-b5e8-9ea618b85422	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 15:51:04.436428
97e4175d-802b-42cd-ab7f-57cf3229a191	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 15:52:16.36483
337eca03-e495-4349-8ec8-91c9cf27e476	be1a274a-663c-45db-952c-bf75d8df53b6	Overtime request created	Requested 2 overtime hours for 2026-02-05	overtime_request	318dd5df-d5e0-4da4-b43b-00a9f06bdaeb	2026-01-03 15:52:56.353903
1c24f79a-fdaf-4ade-b2ce-fe9ecae21b8e	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:53:24.319918
dff3fd38-69a5-4f03-9e4b-03633182de97	82defca1-4380-4327-a959-474de43bf1dc	Overtime request approved	Overtime request was approved	overtime_request	28aa2d6c-930a-474e-a743-b69af401171b	2026-01-03 15:54:49.555867
bd0c841e-620d-45ea-aaca-daa5eacd6671	5886ba74-6aca-441a-8c03-a3d2fe5951a8	User logged in	Sarah Williams logged in	user	5886ba74-6aca-441a-8c03-a3d2fe5951a8	2026-01-03 15:55:51.896141
0a12306b-6aca-447d-8e33-32d8bc7f2273	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:57:03.289199
18a9ca50-67d4-40de-a114-4c2ca1b74ade	5886ba74-6aca-441a-8c03-a3d2fe5951a8	User logged in	Sarah Williams logged in	user	5886ba74-6aca-441a-8c03-a3d2fe5951a8	2026-01-03 15:59:12.638149
65638404-344e-4b9a-bb82-e424308dba11	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 16:00:33.791209
0db8a3fe-3a56-4e1c-a7c8-ded19cd8228d	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 16:24:55.594381
7364278f-bceb-4b95-9cc2-3503227514e2	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 16:25:31.851168
082e0513-6c29-486b-8a98-9c9766d1ea1e	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 16:27:11.834724
b82e47d4-6061-4280-af4c-7e5b88814663	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 16:37:08.769305
90ed4512-9bb7-425a-b0ff-3c27172f82c4	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Timesheet submitted	Submitted timesheet for 1/2026 with 25 hours	timesheet	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-03 16:41:05.724822
95f579cf-6684-4a7a-8dcd-dd9b4c4f7f3d	82defca1-4380-4327-a959-474de43bf1dc	User logged in	Michael Chen logged in	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 16:41:36.173387
01e8b1fb-28ac-4789-9da8-3bdc0e6dfb92	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 16:45:39.474151
8b101ca8-b7a6-48a3-8ca4-601c6dcb5e41	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 17:06:48.980704
7dd1533c-e246-4ae5-b01a-71ea6acbe96d	be1a274a-663c-45db-952c-bf75d8df53b6	Invoice uploaded	Uploaded invoice Invoice-Alex_Johnson-INV-2026-002-January-2026.pdf	invoice	3ef7aa5e-a483-4b0a-bdc2-99c73703c469	2026-01-03 17:08:01.144981
8034499f-4897-4431-8c5c-95446efb800a	6f3bbf1e-57c9-4914-88e6-390ce48668c1	User logged in	Emily Davis logged in	user	6f3bbf1e-57c9-4914-88e6-390ce48668c1	2026-01-03 17:19:45.151663
42d3f868-9003-47d4-9404-fe974b0e7360	be1a274a-663c-45db-952c-bf75d8df53b6	User logged in	Alex Johnson logged in	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 17:24:48.956326
318a5e67-a43f-4259-bd4b-486ec080e6a1	6f3bbf1e-57c9-4914-88e6-390ce48668c1	User logged in	Emily Davis logged in	user	6f3bbf1e-57c9-4914-88e6-390ce48668c1	2026-01-03 21:06:07.392629
f662fec5-7be7-46e3-9ba3-30813f897a69	6f3bbf1e-57c9-4914-88e6-390ce48668c1	User deleted	User account removed	user	6f3bbf1e-57c9-4914-88e6-390ce48668c1	2026-01-03 21:46:14.781992
645c6034-890d-409e-8854-d806e4541352	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 21:49:19.899523
124c8911-4a89-42f9-b2ff-b7bf787f7b29	5886ba74-6aca-441a-8c03-a3d2fe5951a8	User deleted	User account removed	user	5886ba74-6aca-441a-8c03-a3d2fe5951a8	2026-01-03 21:50:27.838
d7ce7fab-d4a6-466f-948a-f48e8d310676	82defca1-4380-4327-a959-474de43bf1dc	User deleted	User account removed	user	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 21:50:33.063354
c76b00fc-cefe-410b-be3b-90ffa9cfb917	be1a274a-663c-45db-952c-bf75d8df53b6	User deleted	User account removed	user	be1a274a-663c-45db-952c-bf75d8df53b6	2026-01-03 21:50:40.111376
1fe24cb4-0134-4641-8f35-28080c3a8325	726502da-d264-4140-a79d-9876ddf20410	User deleted	User account removed	user	726502da-d264-4140-a79d-9876ddf20410	2026-01-03 21:51:03.127312
cd5983b0-0dc0-4943-a51b-e0ecf6d02eeb	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 21:53:42.830559
ee811660-a19d-4934-b561-80721c142fd7	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	04162dc6-53c8-457a-a14a-5f1bb18af6cc	2026-01-03 21:58:40.325269
258538f6-f475-4aad-8955-550e6ccee5f4	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	2d0324d1-ef2f-465e-afdf-fa1afeba1c97	2026-01-03 21:58:47.333445
8e43ea3f-e13c-4a73-b73a-e6028e1c05e1	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	2d0324d1-ef2f-465e-afdf-fa1afeba1c97	2026-01-03 21:58:51.151713
eeef8753-199a-4edd-9561-98922f2e8268	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	318dd5df-d5e0-4da4-b43b-00a9f06bdaeb	2026-01-03 21:58:55.052599
619d8361-e752-497d-9bf1-178a09b51641	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	318dd5df-d5e0-4da4-b43b-00a9f06bdaeb	2026-01-03 21:58:58.496527
b415b22e-29af-42ea-b42c-8809ed5071e2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	318dd5df-d5e0-4da4-b43b-00a9f06bdaeb	2026-01-03 21:59:02.37531
2e917932-ff24-4648-9083-c98c121422d7	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	2a268962-f36b-4a8f-9b50-549bd5f6ae1c	2026-01-03 21:59:06.91346
23530a5d-7a98-4203-b3e9-150f17f046bf	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	d1b9a830-eafa-4601-8634-f143b0079d66	2026-01-03 21:59:11.034033
e8c58513-c3e7-463e-94de-68b24f18e8a5	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	0c6f0139-c0bd-4e54-8c68-2b7e6b4493aa	2026-01-03 21:59:15.44726
4491cc95-4147-48d3-9af4-846dbf50123c	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Overtime request rejected	Overtime request was rejected	overtime_request	0c6f0139-c0bd-4e54-8c68-2b7e6b4493aa	2026-01-03 21:59:20.749161
da9b67eb-5871-45d2-900f-4af686c64afc	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Invoice uploaded	Uploaded invoice Invoice-Pandu_RaharjaLiu-January-2026.pdf	invoice	315a1bc8-a768-485a-9605-62fb32b6f389	2026-01-03 22:00:19.471322
e1af5828-73a3-4c69-bdc0-12ec150ef636	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:09:12.959991
bf1a5b58-7d20-44e6-a3ea-e60612679a47	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:10:02.083677
638ec5ba-82fb-4022-9ed0-9b3fc6f1d3fa	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:10:11.280857
ae0da560-6c98-4435-bc04-6afac220aeea	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Invoice uploaded	Uploaded invoice test-invoice.pdf	invoice	5e20211c-6223-4d7e-948f-178531204a83	2026-01-03 22:11:07.800082
0f03738f-a522-46c1-bb04-5e2bda20c2ec	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Invoice uploaded	Uploaded invoice test-invoice.pdf	invoice	f29751ee-2eba-4205-bc0e-0b34a9a20245	2026-01-03 22:12:34.792392
ebbca703-1358-4da6-9a66-8db570cd0996	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:23:15.314737
c27b9608-d539-41ad-bca9-37b72358f0b3	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:29:11.073333
8262a89b-8486-4ab3-b5f8-1afa03d7b09b	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:31:54.660062
bada2862-a01c-4aca-a7e5-2bfea0f75fd6	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Invoice uploaded	Uploaded invoice Invoice-Pandu_RaharjaLiu-February-2026.pdf	invoice	f27f8c4b-7fa6-40ef-bcf5-df32325232fb	2026-01-03 22:39:36.520505
9724614d-2fca-4db9-8843-0fab5068abb6	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:45:42.351825
98fedb52-a2a0-453b-9170-8a47a9603159	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Invoice uploaded	Uploaded invoice Invoice-Pandu_Raharja_Liu-INV-2026-003-February-2026.pdf	invoice	8e86651f-97c0-43b4-a721-73af038ae9f3	2026-01-03 22:47:17.096174
6f44a34f-f9f4-42b2-8f20-08928caff2e5	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Invoice uploaded	Uploaded invoice Invoice-Pandu_RaharjaLiu-January-2026.pdf	invoice	0071144a-4899-4ab5-94f4-afd58699604e	2026-01-03 22:50:23.071185
95e5ab1d-a17a-4660-8765-4297d1308d49	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:57:32.479476
5da1e93d-f36e-4ec9-8d0d-6b24d55d4578	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:58:42.793221
81897c3e-77f2-4c7d-acfe-8ab3861d19cf	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 22:59:39.74002
2803ea71-e8a9-4d06-a8dc-af5d78bf57f1	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 23:24:16.172482
df065a02-ed90-4eea-8e5c-8a48396e5173	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 23:24:52.36305
855e75cc-ef64-4256-99ed-84c6332bf393	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-03 23:42:09.649123
fe4b787a-70d1-4b3b-ab96-aade940d8d34	c2739d58-e291-4403-8638-f316ff77fd90	User logged in	Adeel Atta logged in	user	c2739d58-e291-4403-8638-f316ff77fd90	2026-01-04 10:36:05.866788
79c825f8-459f-4ded-a97b-8d5b626bdd48	c2739d58-e291-4403-8638-f316ff77fd90	User logged in	Adeel Atta logged in	user	c2739d58-e291-4403-8638-f316ff77fd90	2026-01-04 10:43:52.726426
c2ecca00-b5b8-4c67-8396-8d9832ee6712	b05db02a-2ea0-407b-bd83-afd8a872bde4	Password reset	Password reset for Zunaira Zubair	user	b05db02a-2ea0-407b-bd83-afd8a872bde4	2026-01-04 10:44:51.068766
f4a12292-87de-49c5-8a2d-4408f8522c6f	c2739d58-e291-4403-8638-f316ff77fd90	User logged in	Adeel Atta logged in	user	c2739d58-e291-4403-8638-f316ff77fd90	2026-01-04 10:55:36.782599
a8c4f8aa-5389-4ba5-935e-9859bf22083d	9a86bcee-3782-40c8-b23c-e855639f22c0	Password reset	Password reset for David Aniebo	user	9a86bcee-3782-40c8-b23c-e855639f22c0	2026-01-04 11:00:57.795135
62ff710b-cdf9-40ae-81ba-e64906f79769	c2739d58-e291-4403-8638-f316ff77fd90	User logged in	Adeel Atta logged in	user	c2739d58-e291-4403-8638-f316ff77fd90	2026-01-04 11:01:45.473598
c7982d10-0bba-4106-9352-e42b2975886b	c2739d58-e291-4403-8638-f316ff77fd90	User logged in	Adeel Atta logged in	user	c2739d58-e291-4403-8638-f316ff77fd90	2026-01-04 11:02:43.709691
efdffd9f-071d-42e3-8937-97a25765b1de	9a86bcee-3782-40c8-b23c-e855639f22c0	User logged in	David Aniebo logged in	user	9a86bcee-3782-40c8-b23c-e855639f22c0	2026-01-04 11:03:07.603319
88dd3a5e-2295-4576-8f1e-ca87da30a558	9a86bcee-3782-40c8-b23c-e855639f22c0	Password changed	Password changed successfully	user	9a86bcee-3782-40c8-b23c-e855639f22c0	2026-01-04 11:03:25.840451
3257a5ce-ea6d-4d90-a739-f3ab91f6a8a8	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-04 13:32:29.194581
6b77ef66-ac0d-4505-be7c-26f209f38775	test-supervisor-001	User logged in	Test Supervisor logged in	user	test-supervisor-001	2026-01-04 13:34:01.472284
9cb40fbc-45a7-47dd-99be-c8e22d9404d5	test-supervisor-001	User logged in	Test Supervisor logged in	user	test-supervisor-001	2026-01-04 14:16:09.150843
1a64358c-7a21-43d0-8e0f-aa50568115a6	c2739d58-e291-4403-8638-f316ff77fd90	User logged in	Adeel Atta logged in	user	c2739d58-e291-4403-8638-f316ff77fd90	2026-01-04 14:17:40.947587
0da2b5d0-faa9-4bf0-8034-c5e4cd4abd33	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-14 22:08:43.832447
a7391040-07fd-4936-92fa-39506a606a18	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-14 22:12:58.295841
4d859bb3-bd45-451d-a12d-d56e792f7912	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Password changed	Password changed successfully	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-14 22:13:15.868754
257ef074-c39a-408f-8490-8726eb61ef09	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-14 22:16:14.013873
183eeca2-9afc-436c-b6f5-792e365e6950	c2739d58-e291-4403-8638-f316ff77fd90	User deleted	User account removed	user	c2739d58-e291-4403-8638-f316ff77fd90	2026-01-14 22:16:42.935815
139f3652-56e2-4db5-84ae-5ca8661fe13e	52369260-d9da-4470-b769-09659ceacf39	User created	Created user Adeel Atta	user	52369260-d9da-4470-b769-09659ceacf39	2026-01-14 22:18:38.564534
aa6bad83-60d4-4390-9715-0145b36bcd47	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-14 23:19:26.793965
2d475d7b-0532-4a6f-87a1-f243898fe9a4	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-14 23:20:22.235646
15809723-1fd3-428e-a7d1-36ad892b454c	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	User created	Created user Malik Supervisor	user	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	2026-01-15 07:54:53.887467
89db5cad-43f1-45f1-8d41-7374262fee57	test-ic-user-001	Password reset	Password reset for Test ICUser	user	test-ic-user-001	2026-01-15 07:56:14.967226
a2507358-434c-4393-8341-4e83da38adf2	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 07:57:45.970638
d17b2bb6-5906-4885-a54c-140a70ecc357	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 07:58:17.75382
49048be7-23ad-4ccd-91f0-1f2f0013f6f9	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-15 07:58:34.968247
e7644c70-dd0e-4011-9b72-a43df3748085	test-ic-user-001	Password changed	Password changed successfully	user	test-ic-user-001	2026-01-15 07:58:46.432154
57ad9371-7deb-41cf-8033-dcb364875fad	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-15 08:09:02.389501
aa263a31-2e70-431c-9d2c-d9ffdcae74a6	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-15 08:09:43.07159
d3105737-373c-45bc-99f8-2ebab66ef1c9	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-15 08:11:08.368005
2778e56d-7fe6-4532-877c-8cbf9d47cf16	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 08:20:01.564117
37f0cb37-f28e-4842-96df-fac2f45d738d	test-supervisor-001	Password reset	Password reset for Test Supervisor	user	test-supervisor-001	2026-01-15 08:20:21.535552
e4e7e63d-7efc-4fd4-b3c7-37f3acb67fd8	test-supervisor-001	User logged in	Test Supervisor logged in	user	test-supervisor-001	2026-01-15 08:22:06.50534
bfb09cdf-bfc2-4c96-9923-23089f723f05	test-supervisor-001	Password changed	Password changed successfully	user	test-supervisor-001	2026-01-15 08:22:16.715696
22d0ecb7-d5c1-4d66-8be6-11fd05654784	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 08:23:20.557207
e9880be8-9b12-4e30-b0c0-4d750056510f	test-ic-user-001	Password reset	Password reset for Test ICUser	user	test-ic-user-001	2026-01-15 08:23:37.404379
879ee0b0-a826-40d6-bc8d-2237bdd2030c	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-15 08:23:56.865977
09dd628f-1ce2-4af7-9a6a-419cc1a3dcfe	test-ic-user-001	Password changed	Password changed successfully	user	test-ic-user-001	2026-01-15 08:24:15.521686
9e34404b-1650-46b9-8971-cbe977dbca40	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-15 08:24:33.505603
8aa52dda-0821-4850-908a-e21a26e27f9a	test-ic-user-001	Overtime request created	Requested 2 overtime hours for 2026-01-07	overtime_request	9d2f140b-512d-4153-8af2-8428009c477d	2026-01-15 08:25:47.997759
622aaa77-0dec-41db-8061-6fcf9954171a	test-supervisor-001	Overtime request rejected	Overtime request was rejected	overtime_request	9d2f140b-512d-4153-8af2-8428009c477d	2026-01-15 08:29:16.672778
92588c02-43c6-4ecd-b16a-3d52e7d0f93f	test-ic-user-001	Overtime request created	Requested 1 overtime hours for 2026-01-12	overtime_request	d70be991-7627-4581-9ccd-1d7439bb34d8	2026-01-15 08:34:09.831017
6c3d1d52-450d-439f-95f5-95786ceb6e86	test-supervisor-001	Overtime request approved	Overtime request was approved	overtime_request	25704dae-c1e5-4bc8-afdb-b654c8f95931	2026-01-15 08:35:16.462851
8c19832f-0a91-4583-ad36-f65e1554548b	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-15 09:06:55.291099
c4d40873-1aa6-499e-9ded-a775dfa8437f	test-ic-user-001	User logged in	Test ICUser logged in	user	test-ic-user-001	2026-01-15 09:23:53.706207
d50548c1-593c-42cb-8d93-006e23a31af7	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 12:54:31.628651
2d58ce14-0828-44f3-baae-fe79c0fc3cab	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	User logged in	Malik Supervisor logged in	user	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	2026-01-15 12:55:16.741205
1d6b939f-6967-4ab9-8fc5-4fc93b30ec1e	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	OOO request created	Requested time off from 2026-01-19 to 2026-01-22	ooo_request	47b128c5-4f6d-4d22-8c99-6ab6fdbdc3dd	2026-01-15 12:55:44.210528
188696c6-35a6-498a-9ddf-6a8d4a9765ba	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 12:56:03.131063
07b58b37-680e-4861-bd14-a7d297abcef6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request approved	Leave request was approved	ooo_request	47b128c5-4f6d-4d22-8c99-6ab6fdbdc3dd	2026-01-15 12:57:28.077673
eaaee21c-ead3-40f3-a45f-4ff008553e18	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	User logged in	Malik Supervisor logged in	user	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	2026-01-15 12:59:18.015113
4e203879-d0b6-4cd9-b609-697acec9fde2	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	OOO request created	Requested time off from 2026-01-20 to 2026-01-23	ooo_request	83769e70-41e2-457f-8573-ee0ce96937df	2026-01-15 13:02:58.673898
d33e4bc5-4c9c-48cf-85b0-d85428af35b8	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 13:03:11.954028
07355819-0f4f-4916-844f-4cdebf38ecb3	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request approved	Leave request was approved	ooo_request	83769e70-41e2-457f-8573-ee0ce96937df	2026-01-15 13:03:54.974802
76f0eb7a-7d95-4548-bfdc-281b431755f3	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	User logged in	Malik Supervisor logged in	user	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	2026-01-15 13:12:25.943543
4cc8ba64-0296-47e6-9876-71c2a7f20d0a	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	OOO request created	Requested time off from 2026-01-28 to 2026-01-29	ooo_request	24337aa5-3376-4828-ab39-557e6c8dcf8d	2026-01-15 13:12:39.595206
fd7884cb-830c-49d0-bd92-a6c5392142ad	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request approved	Leave request was approved	ooo_request	24337aa5-3376-4828-ab39-557e6c8dcf8d	2026-01-15 13:12:59.655928
1d4cc7e5-ecd2-4d6d-9c49-5addb1ab9b07	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	OOO request created	Requested time off from 2026-01-22 to 2026-01-23	ooo_request	cc02c639-8100-41e7-a24b-9051f5908f83	2026-01-15 13:44:08.453427
e0921cd5-9578-4eaa-a89d-1c4b5bec3151	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request approved	Leave request was approved	ooo_request	cc02c639-8100-41e7-a24b-9051f5908f83	2026-01-15 13:45:28.551835
79f1c79b-8fd9-4ecb-91b6-fcb3b337126a	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 19:13:03.403847
bb4fd64f-4830-4448-85dc-62dfa7b1e0d4	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 19:17:42.153543
7f31c2c6-4737-4fc0-adf8-116c9f79f20e	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-16 08:58:48.88941
2412158d-1761-476a-ac08-8005a6f7ed5f	b05db02a-2ea0-407b-bd83-afd8a872bde4	User deleted	User account removed	user	b05db02a-2ea0-407b-bd83-afd8a872bde4	2026-01-16 08:59:08.78696
1fe2071d-3b85-4237-bfa1-ebb2688e2b14	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User deleted	User account removed	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-16 08:59:14.012958
1bcbc95b-825c-4ec5-936b-144a1c23d781	9a86bcee-3782-40c8-b23c-e855639f22c0	User deleted	User account removed	user	9a86bcee-3782-40c8-b23c-e855639f22c0	2026-01-16 08:59:19.590632
2ea66dbf-b3b6-4a21-8746-e11c806058a4	7247837c-37d3-4cd3-84c8-0997fcd77393	User deleted	User account removed	user	7247837c-37d3-4cd3-84c8-0997fcd77393	2026-01-16 08:59:24.159737
06cf14aa-5665-4c93-bcd0-62bddff14a25	46008b81-b974-4f7c-a474-9f8fc901b5c2	User deleted	User account removed	user	46008b81-b974-4f7c-a474-9f8fc901b5c2	2026-01-16 08:59:28.623317
a3a183e6-8df3-42c7-ae5b-fc66eaf971d1	dd225f63-805d-4f9a-be83-ce9bfa5f48f8	User deleted	User account removed	user	dd225f63-805d-4f9a-be83-ce9bfa5f48f8	2026-01-16 08:59:33.692661
7f06ad6f-b7b7-4d04-824a-a8b3f0c0252d	2b6babea-e138-4a6c-8855-d8fe6949a42b	User deleted	User account removed	user	2b6babea-e138-4a6c-8855-d8fe6949a42b	2026-01-16 08:59:37.981333
482b26fb-5d4f-4621-905e-b253acfac649	52369260-d9da-4470-b769-09659ceacf39	User deleted	User account removed	user	52369260-d9da-4470-b769-09659ceacf39	2026-01-16 08:59:42.383719
1ba0203e-5063-4a9d-b390-326b87edebeb	test-ic-user-001	User deleted	User account removed	user	test-ic-user-001	2026-01-16 08:59:49.694468
04a43b46-c7c8-4395-bca2-109f92afba5f	606c6a4d-1ec6-4ba9-97db-3e57ab041780	User deleted	User account removed	user	606c6a4d-1ec6-4ba9-97db-3e57ab041780	2026-01-16 08:59:55.715256
5eaa8519-94fa-44c4-abd4-fd701534ab4e	test-supervisor-001	User deleted	User account removed	user	test-supervisor-001	2026-01-16 09:00:03.151295
5dbb9166-90df-4816-a507-f6ce5e6416e0	de794e37-6ef0-4e4c-b121-904de280aa38	User created	Created user Imran Zahoor	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-01-16 09:05:51.383211
2a7b53c9-544c-43d0-abcb-a5d29a008567	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	User created	Created user Malik Demo	user	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	2026-01-16 09:10:57.102553
1ebea76e-3fa1-4301-b57f-81851dc5414f	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	User logged in	Malik Demo logged in	user	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	2026-01-16 09:18:15.609325
d1414e5a-4b15-4deb-9d71-a59d7598ab82	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	OOO request created	Requested time off from 2026-01-19 to 2026-01-21	ooo_request	441fb6df-ca4b-46cc-b8d1-24dcf507145f	2026-01-16 09:19:15.067956
b0e7ed31-a8d4-4a37-852f-922fc2ecdc73	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	Overtime request created	Requested 1 overtime hours for 2026-01-02	overtime_request	d63a8cd2-610a-4bfa-b4bc-f043ea1208f6	2026-01-16 09:21:05.327999
1815b696-eb17-434b-9724-38365bbb525e	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	Timesheet auto-submitted	Timesheet for 1/2026 submitted for approval with invoice	timesheet	433c15f3-3032-414e-be6b-5f46da190c39	2026-01-16 09:23:25.067531
bfa7e56d-4b75-4191-af93-fd065f72692d	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	Invoice submitted for review	Submitted invoice Invoice-Malik_Demo-January-2026.png for approval	invoice	fec44490-9f1c-4702-a7ed-09e9c63ba751	2026-01-16 09:23:25.112984
a7ace750-f856-4aee-8210-7f0966577d7e	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-16 19:18:02.750805
18c49bb8-2959-4675-9a03-80d72ba597e2	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-17 10:10:58.280558
bfdbfeba-a56e-4261-ba43-1f8faf398771	74e619cf-48e9-44b5-a7f9-93f813d7bedf	User logged in	Adeel Atta logged in	user	74e619cf-48e9-44b5-a7f9-93f813d7bedf	2026-01-17 10:12:14.830776
eaa6bc4d-f143-4c3e-b742-5e65cee21ab3	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request rejected	Leave request was rejected	ooo_request	441fb6df-ca4b-46cc-b8d1-24dcf507145f	2026-01-17 10:12:35.894644
9d4d7d56-1c25-43c3-914c-656870aa59f4	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-17 13:23:17.016472
37c00a9b-4fee-45f9-b086-642728b6b4ff	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-01-18 17:51:16.076238
6a98aeb6-035f-460c-bad0-9f993e4f587b	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:47:56.515932
023cbe82-257d-4df7-b5b7-9000ad43efa0	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request rejected	Overtime request was rejected	overtime_request	1df81b53-4585-4653-8b7e-b5b6ce062613	2026-01-18 21:48:26.093898
16fc6909-bed0-4ac9-9839-9e7e82b18336	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request approved	Overtime request was approved	overtime_request	d63a8cd2-610a-4bfa-b4bc-f043ea1208f6	2026-01-18 21:48:30.637574
86f571cf-8b13-43e2-a020-6012ee7bd135	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request approved	Overtime request was approved	overtime_request	0f086654-9568-4dcd-afd3-cc787943252c	2026-01-18 21:48:34.219272
605bec98-4312-4f31-ae76-8f037999e4c9	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request approved	Overtime request was approved	overtime_request	d70be991-7627-4581-9ccd-1d7439bb34d8	2026-01-18 21:48:39.269875
8a83cd93-831c-476d-8b90-80c09321ee5b	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request rejected	Overtime request was rejected	overtime_request	aecbf750-8ee1-46db-b2bc-d07558a0b0e5	2026-01-18 21:48:48.443837
7d823409-ec86-40ae-8d1c-8c08bddc3a31	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request rejected	Overtime request was rejected	overtime_request	c1542201-85dd-4846-895b-0b9181820663	2026-01-18 21:48:53.663636
2c86e7f9-2f22-403b-8d26-02956fa6b896	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request rejected	Overtime request was rejected	overtime_request	5fba0bd7-9c28-4440-847c-a11215a6b656	2026-01-18 21:48:58.03766
303fc38d-2a06-4e1f-ace8-96b0bd276b51	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request rejected	Overtime request was rejected	overtime_request	cc768a2a-7dfd-4629-95f4-b3eb775bd14c	2026-01-18 21:49:02.908694
1f3fd55d-adb7-4450-a6ab-2eb443a9b9d5	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request rejected	Overtime request was rejected	overtime_request	96d37225-bd52-4ccb-8e06-a7039b201017	2026-01-18 21:49:08.582538
183c893a-a8cd-4506-a3de-42c970680059	2998c744-43bb-4633-86a1-80d576c52931	User logged in	Emmanuel Agba logged in	user	2998c744-43bb-4633-86a1-80d576c52931	2026-01-19 07:01:33.018229
3241a9d2-cd25-4390-82b6-dc5a9d1dd1a6	74e619cf-48e9-44b5-a7f9-93f813d7bedf	User logged in	Adeel Atta logged in	user	74e619cf-48e9-44b5-a7f9-93f813d7bedf	2026-01-19 09:54:45.238014
45ae66f6-bccc-4878-a1de-0733ab2e1930	74e619cf-48e9-44b5-a7f9-93f813d7bedf	OOO request created	Requested time off from 2026-01-09 to 2026-01-09	ooo_request	e7951620-aa83-4b9a-a75c-44a4f437d819	2026-01-19 09:56:07.922467
47b51182-f48b-4c1b-9822-e69610699e7e	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-19 10:07:49.363859
0b631f8c-6c43-47fa-8899-1fb8d7f1b150	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request approved	Leave request was approved	ooo_request	e7951620-aa83-4b9a-a75c-44a4f437d819	2026-01-19 10:09:04.670089
f070e815-1123-485e-8980-57b9a4e373a0	05cb123d-2241-4695-88cd-e2969d2a22ef	User logged in	Salem Daniel logged in	user	05cb123d-2241-4695-88cd-e2969d2a22ef	2026-01-20 07:57:21.368237
8914bad4-36d0-4b40-a40a-ee885bf33df9	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-20 10:29:00.465
c9ed29c6-7f7e-4ef9-82e1-0c0953496103	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-01-20 12:05:40.244966
0ce90588-729d-4b0a-869f-7effa46911b1	2998c744-43bb-4633-86a1-80d576c52931	User logged in	Emmanuel Agba logged in	user	2998c744-43bb-4633-86a1-80d576c52931	2026-01-20 12:22:06.85649
c8f34943-3c59-4f64-aca3-4db351faed76	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-01-21 13:18:48.32554
b9756c60-94a2-48a4-87fe-76eefc8e470b	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-21 16:07:11.692507
5fc437dd-6ed9-4c99-b20f-47ce30502570	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-01-22 13:58:17.274958
a6db82d1-0ff4-4e87-9a68-307d5b931863	2998c744-43bb-4633-86a1-80d576c52931	User logged in	Emmanuel Agba logged in	user	2998c744-43bb-4633-86a1-80d576c52931	2026-01-23 08:22:12.321112
6b7fd06a-f61f-46bb-a6fd-afebf19325b6	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-01-26 07:50:47.36703
215b5797-b4c5-4229-ba9e-f7065d55dfe4	2998c744-43bb-4633-86a1-80d576c52931	User logged in	Emmanuel Agba logged in	user	2998c744-43bb-4633-86a1-80d576c52931	2026-01-27 17:07:12.008858
7f442b68-a7cd-4ff7-8bb5-3f279a265fea	74e619cf-48e9-44b5-a7f9-93f813d7bedf	User logged in	Adeel Atta logged in	user	74e619cf-48e9-44b5-a7f9-93f813d7bedf	2026-01-28 02:41:17.138628
d7d3e7e4-2e3b-4a30-b63d-e18e851955a7	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-01-28 08:27:19.935451
8419f682-b7a5-42e7-9a9e-a0f2f0729f2d	74e619cf-48e9-44b5-a7f9-93f813d7bedf	User logged in	Adeel Atta logged in	user	74e619cf-48e9-44b5-a7f9-93f813d7bedf	2026-01-30 11:22:19.491919
a609b854-bfb5-41a1-8b66-127faf39ca80	74e619cf-48e9-44b5-a7f9-93f813d7bedf	Timesheet auto-submitted	Timesheet for 1/2026 submitted for approval with invoice	timesheet	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-30 11:30:11.379788
4f6c9c89-1030-4387-bc6d-1f5def9d5201	74e619cf-48e9-44b5-a7f9-93f813d7bedf	Invoice submitted for review	Submitted invoice Invoice-Adeel_Atta-INV-2026-001-January-2026.pdf for approval	invoice	a91d15e5-c760-4c4c-a398-be88ce43adfd	2026-01-30 11:30:11.428063
00891290-89f3-43ae-8927-1225c5d4b329	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-30 11:41:43.825471
0bb2b97e-9164-41fc-a439-20f6bcab87db	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-31 08:52:44.44425
3433b591-a010-41de-8188-7000ab3bf504	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-31 12:36:27.778944
7eb59255-948a-4ad1-a5c8-8e1acad127fb	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-02-01 13:46:46.295151
df4a44a3-dd8e-4529-98c6-c3c9fa8486b1	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-01 13:59:21.247852
4ca0c83c-8792-4b43-8fa8-26df13127b0e	de794e37-6ef0-4e4c-b121-904de280aa38	Timesheet auto-submitted	Timesheet for 1/2026 submitted for approval with invoice	timesheet	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-02-01 15:35:48.996678
630c99b8-284b-4030-bf93-59be5444574e	de794e37-6ef0-4e4c-b121-904de280aa38	Invoice submitted for review	Submitted invoice Invoice-Imran_Zahoor-January-2026.pdf for approval	invoice	65dce3b2-a439-4ac5-b4da-cb3c155ba1b6	2026-02-01 15:35:49.046206
4098d971-2690-44f0-9200-bbaeefcc82ee	05cb123d-2241-4695-88cd-e2969d2a22ef	User logged in	Salem Daniel logged in	user	05cb123d-2241-4695-88cd-e2969d2a22ef	2026-02-02 07:58:42.627293
deb698f2-2b0e-44a4-99f1-99bfcc61d0f7	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Invoice rejected	Rejected invoice UPLOAD-1768555401348: demo	invoice	fec44490-9f1c-4702-a7ed-09e9c63ba751	2026-02-02 08:01:25.082291
02a4bc7a-0acb-4406-ad83-c5ec32d4b226	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Invoice rejected	Rejected invoice INV-2026-002: demo	invoice	3ef7aa5e-a483-4b0a-bdc2-99c73703c469	2026-02-02 08:01:33.414797
c1f6d53e-f474-46fb-8493-77f6a4fb8c93	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Invoice rejected	Rejected invoice INV-2026-001: demo	invoice	4fb1d253-9883-44ca-b917-8afe97d29e6d	2026-02-02 08:01:39.184838
e8297274-846c-4a21-8a53-2957c2ecab86	05cb123d-2241-4695-88cd-e2969d2a22ef	Timesheet auto-submitted	Timesheet for 1/2026 submitted for approval with invoice	timesheet	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-02-02 09:35:34.325607
f2676f54-70b9-4abd-b0ca-2cf968fef5f2	05cb123d-2241-4695-88cd-e2969d2a22ef	Invoice submitted for review	Submitted invoice Invoice-Salem_Daniel-January-2026.pdf for approval	invoice	c854ca4c-dc7a-4d90-86c3-867abca8771c	2026-02-02 09:35:34.370465
b96eb635-12b2-4794-8565-4e29e60614af	a23598e5-97e2-4a34-a052-6aa30e11d92b	Password reset	Password reset for Pandu Raharja-Liu	user	a23598e5-97e2-4a34-a052-6aa30e11d92b	2026-02-02 12:25:12.349762
8537f750-b809-4da4-9fa5-e70bf97b01e1	74e619cf-48e9-44b5-a7f9-93f813d7bedf	User logged in	Adeel Atta logged in	user	74e619cf-48e9-44b5-a7f9-93f813d7bedf	2026-02-02 15:33:56.016647
a3743def-6099-48a6-8261-88f9b4081670	74e619cf-48e9-44b5-a7f9-93f813d7bedf	User logged in	Adeel Atta logged in	user	74e619cf-48e9-44b5-a7f9-93f813d7bedf	2026-02-02 18:47:15.47966
5d691571-dcb1-4a4a-805d-46394fd0928e	2998c744-43bb-4633-86a1-80d576c52931	User logged in	Emmanuel Agba logged in	user	2998c744-43bb-4633-86a1-80d576c52931	2026-02-03 08:24:17.913395
b2a0e500-db58-4387-98de-cbb0c844494c	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-02-03 11:00:03.49181
af90fa06-51e8-4bba-a44c-be3e8d9a7d91	a23598e5-97e2-4a34-a052-6aa30e11d92b	User logged in	Pandu Raharja-Liu logged in	user	a23598e5-97e2-4a34-a052-6aa30e11d92b	2026-02-03 15:21:21.993846
8eba9b6b-0655-4bf9-8a84-686d8fa235fb	a23598e5-97e2-4a34-a052-6aa30e11d92b	Password changed	Password changed successfully	user	a23598e5-97e2-4a34-a052-6aa30e11d92b	2026-02-03 15:22:01.544027
2b466d28-3b12-477a-94a2-4795e0878174	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-03 15:45:53.969608
be7a943a-eaae-4b44-9781-54c55b830f9f	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Invoice approved	Approved invoice UPLOAD-1770024920492	invoice	c854ca4c-dc7a-4d90-86c3-867abca8771c	2026-02-03 15:56:22.352901
96c6d984-c71f-4f88-b856-c26f6a695d0f	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Invoice approved	Approved invoice UPLOAD-1769960147596	invoice	65dce3b2-a439-4ac5-b4da-cb3c155ba1b6	2026-02-03 15:56:26.555933
04f60d47-270f-47f4-892f-65d5c81073f0	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Invoice approved	Approved invoice INV-2026-001	invoice	a91d15e5-c760-4c4c-a398-be88ce43adfd	2026-02-03 15:58:20.37396
99d5b4f9-1e19-4de6-a81a-90f11a156de7	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-04 11:26:39.110021
580be792-edd8-44f4-9c04-aace3f26cca6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request created	Requested time off from 2026-02-11 to 2026-02-12	ooo_request	434aa26f-2956-4791-8385-462a4c679c0c	2026-02-04 11:27:46.760669
c9fd4532-2467-4e91-aad7-de5b6b13b50c	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request created	Requested 1 overtime hours for 2026-02-04	overtime_request	aad7c5d2-8488-4aee-a871-b5f66fc0ad9d	2026-02-04 11:28:41.795851
1aa3e76a-2984-43a3-97f1-8cd7ce6576b1	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request created	Requested -6 overtime hours for 2026-02-07	overtime_request	4b8cb1e0-3378-49ad-b5f8-4c8b84ef9cc5	2026-02-04 11:29:07.21454
b209ae7e-a4af-4d17-8090-2917f2606c8a	63552eff-f6aa-473e-92bc-957991d3505d	User created	Created user Malik K. Contractor	user	63552eff-f6aa-473e-92bc-957991d3505d	2026-02-04 11:50:08.116734
218a710e-a826-4564-84a1-0fadec558b5c	63552eff-f6aa-473e-92bc-957991d3505d	User logged in	Malik K. Contractor logged in	user	63552eff-f6aa-473e-92bc-957991d3505d	2026-02-04 11:50:53.883267
3101986d-0027-4394-8d5e-7b66d0f5c045	63552eff-f6aa-473e-92bc-957991d3505d	OOO request created	Requested time off from 2026-02-10 to 2026-02-12	ooo_request	44cc6f95-f332-460b-a090-275a0239027f	2026-02-04 11:51:19.106577
10a4610e-bf44-4638-a108-455c45796147	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request approved	Leave request was approved	ooo_request	44cc6f95-f332-460b-a090-275a0239027f	2026-02-04 11:52:23.042951
ac96f13a-7419-4385-819a-4c8d8efb7edc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-04 11:54:44.461493
ebdc2c12-a7bf-46a0-a7cf-b4f7a38a3180	63552eff-f6aa-473e-92bc-957991d3505d	User logged in	Malik K. Contractor logged in	user	63552eff-f6aa-473e-92bc-957991d3505d	2026-02-04 11:56:03.221022
055cac77-26d6-4c77-9485-17970cfbd2e4	63552eff-f6aa-473e-92bc-957991d3505d	OOO request created	Requested time off from 2026-02-05 to 2026-02-06	ooo_request	44366729-c03a-45e9-9cc6-372fadc267b2	2026-02-04 11:56:55.115381
bab62172-50ad-4646-937f-f4b6abce1ad8	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request approved	Leave request was approved	ooo_request	44366729-c03a-45e9-9cc6-372fadc267b2	2026-02-04 11:57:39.073285
13ac8a5f-8fea-4e2a-9575-66462811a862	63552eff-f6aa-473e-92bc-957991d3505d	Overtime request created	Requested 1 overtime hours for 2026-02-16	overtime_request	9f58ff56-2f63-4d02-ba0a-949dc77ad963	2026-02-04 11:59:12.051708
bf70f08f-d194-4a33-a32f-b17e17ef56a4	63552eff-f6aa-473e-92bc-957991d3505d	Self-evaluation started	Created performance evaluation for period 2026-02-01 to 2026-02-28	evaluation	756b83de-ddae-4911-bc88-e100587928a6	2026-02-04 12:02:49.217098
0be3b209-090b-41d1-88e4-054f962f30d5	63552eff-f6aa-473e-92bc-957991d3505d	Self-assessment submitted	Submitted self-assessment for period 2026-02-01 to 2026-02-28	evaluation	756b83de-ddae-4911-bc88-e100587928a6	2026-02-04 12:04:09.487774
0c3e6c31-2c05-4cd8-95a7-9cf28b48ab58	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Evaluation completed	Finalized evaluation for period 2026-02-01 to 2026-02-28	evaluation	756b83de-ddae-4911-bc88-e100587928a6	2026-02-04 12:05:14.770847
fb3615cf-243b-4d09-8b8f-b0d4562215cf	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-04 12:24:33.568779
f3205b3b-a786-49fb-8411-55ef314b2629	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Evaluation created	Created performance evaluation for period 2025-12-02 to 2026-02-12	evaluation	6650ddbc-ac4e-487d-895c-0fea1089b306	2026-02-04 12:26:19.167812
78eee599-b2bd-4d1a-8c80-6429e7ff2159	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request approved	Overtime request was approved	overtime_request	9f58ff56-2f63-4d02-ba0a-949dc77ad963	2026-02-04 12:26:52.635215
24ddd7c2-588b-4d60-96df-d34028b69db9	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request approved	Overtime request was approved	overtime_request	14835783-5609-4052-8fb0-dbcd1dcbabbe	2026-02-04 12:27:05.128455
991df907-5b7c-459d-9fac-d37aefebfca9	63552eff-f6aa-473e-92bc-957991d3505d	OOO request created	Requested time off from 2026-02-23 to 2026-02-25	ooo_request	4bb4fe99-63e8-41bc-981c-51682a9f8168	2026-02-04 12:37:10.575804
4549e898-1288-431b-b0a0-97d918689191	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request approved	Leave request was approved	ooo_request	4bb4fe99-63e8-41bc-981c-51682a9f8168	2026-02-04 12:38:27.589352
48ede5b4-1237-4aed-95f2-d00f1d3e9f47	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-02-05 08:09:50.834449
170cc3eb-1c31-466f-8042-f007d1f79e6b	2998c744-43bb-4633-86a1-80d576c52931	User logged in	Emmanuel Agba logged in	user	2998c744-43bb-4633-86a1-80d576c52931	2026-02-05 08:39:48.713584
40d46e4f-a803-4c26-8516-049e92b518d4	2998c744-43bb-4633-86a1-80d576c52931	Timesheet auto-submitted	Timesheet for 1/2026 submitted for approval with invoice	timesheet	466401e1-e47a-474d-8d7d-937db22d39f8	2026-02-05 09:09:31.893651
e0b0b43b-3529-4da0-b58f-d0568465d6e3	2998c744-43bb-4633-86a1-80d576c52931	Invoice submitted for review	Submitted invoice Invoice-Emmanuel_Agba-January-2026.pdf for approval	invoice	f5d38278-c7b7-48d5-8686-ad57ee6b804d	2026-02-05 09:09:32.010547
4f940d19-9995-401f-b829-06790a823a21	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-06 07:42:25.059581
a2905125-5594-4017-ab59-1b3ebe45c474	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-02-06 16:35:43.357782
ec2222b6-903a-4c23-9253-0b0a44e763bc	2998c744-43bb-4633-86a1-80d576c52931	User logged in	Emmanuel Agba logged in	user	2998c744-43bb-4633-86a1-80d576c52931	2026-02-09 13:05:29.729477
a9eff044-ccb9-4570-9e94-e69c73f8576d	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-02-10 07:56:06.879063
e191099d-7113-46ff-a4c2-3a17927e39b9	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-10 12:59:59.658833
9f4a7813-1acd-41c3-9b3b-ccdac037e415	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-11 13:33:52.899646
b9a0ecfe-c4f8-49bd-8850-cff0983b93c9	ed456247-0fe5-47d9-87c1-c2af4e1a4139	User created	Created user Yuliya M	user	ed456247-0fe5-47d9-87c1-c2af4e1a4139	2026-02-11 13:37:00.175777
3545b67f-cd05-4bc1-b046-72ffdb7a05da	38cc3c9a-a1da-4aab-9408-75d1f5f4bcb8	User created	Created user Galyna Korol	user	38cc3c9a-a1da-4aab-9408-75d1f5f4bcb8	2026-02-11 15:18:28.001619
fb9d7b2e-7b06-4ce6-b466-44750b655472	1d9304c8-2b7e-4cc1-b1b4-0c6142e4ba66	User created	Created user Rejoice Obosi	user	1d9304c8-2b7e-4cc1-b1b4-0c6142e4ba66	2026-02-11 15:19:54.643136
46056f28-ee3c-4679-8325-607551dc54f9	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-02-13 09:51:16.262665
9164c1bf-f4b9-44ef-9fe3-ed4e5a5692dd	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-18 15:32:58.922075
cbaec2e1-a052-4393-9cf9-142baa95ee35	de794e37-6ef0-4e4c-b121-904de280aa38	User logged in	Imran Zahoor logged in	user	de794e37-6ef0-4e4c-b121-904de280aa38	2026-02-20 12:09:55.701093
ae7a028a-f50e-4900-ba99-9a34bc640ec1	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-23 08:02:00.018556
\.


--
-- Data for Name: daily_entries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.daily_entries (id, timesheet_id, date, hours, activity_log) FROM stdin;
c54c0c54-f0b5-4202-be48-e9d6de1eb124	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-07	11	worked till night\n
61658ff7-e61b-4b81-81bf-4ff230b230ec	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-12	4	Marketing
1167696e-e117-416c-aa08-4e67f325be9d	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-10	8	Completed API integration and testing
2288c962-4a4f-4708-a29f-cac6aaed3be1	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-06	8	- Investigate and fix fetch team plan bug on prod.\n- Update affected team data and resolve fetching billing plan sentry error.\n- Improved subscription error reporting for retrieve invoice handler.
a80ef0ac-da18-48fe-9b6c-78c30a382d80	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-12	8	- Review Adeel PR on billing info update.\n- Fix mix-panel identity error.\n- Investigate zero value for applied invoice on stripe.
ca7dcb0b-ac82-471f-917a-82438d881005	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-05	7	Autosave test entry
f7c31ed1-7386-497f-ae84-6940e04cee40	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-03	1	worked on a
a89a5847-54fa-4c5a-bbb8-28348b777a06	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-17	4	Weekend work test
69982851-c29c-4b59-b053-36168fc34470	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-06	8	worked 8
92c074d3-665b-4d67-b0bc-7832ad464913	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-07	8	worked 10 today
5537eba7-4f1c-47e0-b9d1-2b109abe829b	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-10	3	worked on the weekend.
8bcf6a19-1b7d-472b-b986-fda26be2dcff	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-11	7	worked on a sunday
ea0e0bd7-b0a4-427b-b79b-e246bb1b15f2	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-13	8	- Develop and update UI for pricing page update.\n- Address env subscription issues on QA\n- Merge changes for mix-panel properties to prod
307981e4-ccfa-4f6d-839e-22530c5a3f78	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-14	8	- Develop pricing UI page update changes.\n- Resolve design inconsistencies with app and Figma.\n- update stripe feature data list
a4cf1063-9a80-4e83-987f-d8dbc0cd3a83	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-15	8	- merge price list changes to prod.\n- resolve team list feature bug.\n- Address sentry undefined subscription bugs.
bed116a9-63cd-411f-988b-f410dc4bf379	433c15f3-3032-414e-be6b-5f46da190c39	2026-01-01	8	. some frontend designs. \n. user interviews\n. some meetings. 
4533b0e7-6439-4edf-8eec-59ea8a741016	433c15f3-3032-414e-be6b-5f46da190c39	2026-01-02	9	activity.
13288641-072f-435d-90a6-c36926e21864	433c15f3-3032-414e-be6b-5f46da190c39	2026-01-03	3	work on weekends
c31c456b-d351-447a-acd7-0a0b8aba9ad4	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-12	8	worked 9 on a monday. 
4698866d-17ca-4d97-b8a1-dc52e0a8306c	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-16	8	- Refactor update billing address field.\n- Resolve error encountered when a user tries to deactivate an account with subscription schedule.\n- Address team subscription cancellation previously not cancelled on stripe.
6289cad9-d146-4bf4-b3e4-506712e0c4a5	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-28	8	- Fix stripe CDN element layout bug.\n- Resolve server issues with worksheet pipeline.
4f2dfa87-a6d9-4d19-a224-46647b9b87f2	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-08	8	- Fix data accessing issues on active subscription and billing.\n- merge and resolve BDD for update card for active subscription ticket.
47469460-144c-46d2-8fac-a188962cdddd	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-09	8	- improves the error handling, reporting for tax computation and retrieval of billing address info error.\n- Rectify UI issues with the resume subscription button and the mobile view for profile setting page\n- Cut off unnecessary request from the team subscription checkout to retrieve billing info and invoice.
82c65958-970b-4176-9be9-314ecbc9bf23	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-07	8	- Resolve edge case where users pass active subscription payment card details wasn’t updated when user updates card.\n- Deployed worksheet client and server side application
b4c2a3f6-5bb3-4987-9fb3-486b6035b3fd	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-19	8	- Resolve discount prorated charge on next subscription upgrade flow.\n- Implement PROMO code validation for product based PROMO codes to resolve application errors.
0f542eec-78b7-439d-8d26-df36cd0a9e95	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-20	8	- Resolved failed BDD scenarios for PROMO discount and subscription error ticket.\n- write 2 scenarios for PROMO code validation for the wrong plan tier.\n- Implement fix for team seat addition purchase subscription processing flow.\n- Fix bug that prevents users from seeing team list features on subscription page.
eb117cf5-2667-4b8b-b236-f7f7a84d11af	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-21	8	- Fix irregular mixpanel reporting for "click template" event and reimplement fix for unset professional type\n- Merge implementation for promo code and subscription errors.
69ecdafe-30ba-49b4-ae0d-4783557deb37	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-22	8	- Fix credit card update bug, preventing users to perform upgrade with updated card details.\n- Resolve negative charge during solo to team migration from a higher priced plan e.g SUPER annual to TEAM monthly plan.\n- Update visual display for the applied credit to the subscription as well as the prorated tax rate if any.
28780ae5-7a3b-40ff-924b-6a7874c201fc	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-23	8	- Implement JWT authentication for worksheet.\n- Move authentication logic to the server side.\n- Merge mix-panel ticket for viewing note event and professional type.
834b278f-6570-4383-9cb0-1d6491cfe1de	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-26	8	- Address issues between the payment flow of purchasing an extra seat to payment success.\n- Introduces a new user experience where users are notified of payment processing before payment confirmation for extra seat purchase.
6ccecd7a-dc54-4655-b369-891dea15567a	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-27	8	- Resolve subscription debited price evaluation mis-match due to customer applied credit.\n- Update UI for checkout and subscription upgrade flow to account for user credit balance.
92625921-3310-4844-91c9-82bc6286a336	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-05	8	- Develop and update UI for worksheet generation.
9ee859bc-1a3a-4302-8ecf-a73c62b59cdd	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-29	8	- fixed failing subscription BDDs \n- Address stripe payment input selector error
ed01fe11-162d-4f85-bc32-9962370626b7	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-30	8	- Resolve conflict with subscription add ons ticket.\n- merge applied credit ticket to Prod\n- prepare handover documentation.
d9747f4f-48d9-4a8e-9d9e-472a43428c62	466401e1-e47a-474d-8d7d-937db22d39f8	2026-01-01	8	For Febuary 2\n\n- Merge changes to enable Promo code at checkout.\n- Address worksheet auth server error.\n- Document SMB flow
c12ede54-f83d-4f9c-a125-074ef96c1c0f	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-19	8	-- Heygen app research about API's\n-- implement Long Prompt & Generated test videos\n-- implemented Prompt (Product Comparisons & Alternatives) & created Test videos\n-- implemented Prompt (Decision-Support Context):created Test videos \n--research out & check possible SEO issues with Mentalyc
64cf282d-9595-41a6-9960-f24799b20adf	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-12	8	fix group client & session notes access bug on team trial\nfix Group practice name permission issue on team member account\nfix missing card banner bug & default payment method for new and active subscriptions users\nretry mechanism for unpaid invoices when adding/updating card details
4090f848-677a-40cb-b3d3-9c2faf563157	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-20	6	Add fact checker improvement in prompts (check for correct features) in new prompts and create test video for verification\nSEO investigation
12904ce4-0f2b-422d-9b01-447fadd3ae4e	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-21	6	Added Loading Modal while inserting notes\nUI fixes on chrome extension\nSEO investigation
e00420d7-0688-4191-bbae-e4c462fcf28c	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-22	8	"Insert to EHR" Extension Button visible for everyplan with Animations and tooltip for new users who had not used chrome extension \n
81edcce3-cc81-4877-b4be-15f0363f975d	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-23	6	SEO investigation,google analysis of traffic & checking for redirection and dublicate urls\ngenerate and schedule podcast videos for all Alliance topic
af81c304-b856-4541-ab9c-e2d4d9a8c2c2	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-13	8	script to update video title automatically on background image of the video podcast.\nBDD fixes related to PR:fix missing card banner bug and default payment method for new and active subscriptions 
00baae55-d30f-44c6-bb87-e78e100f17cf	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-15	7	update script to handle large text in generating audio/metadata/podcastcaptions without failing then\nTest Long prompt v1 to generate few videos and 
19353eb9-aa94-4b04-922b-401f6a16a098	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-16	3	add ICD-10 codes for dependent care and primary support group issues\nresolve and test review comments on autofill credit PR
03c58dcd-995f-4d32-8407-8a344c49860a	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-14	8	Research & test (Haigen) Software for avatar generation\nScript to Auto-fill Session credits for Team subscriptions
ffd4fd9f-18d4-485e-ae42-9eb5bb4602f5	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-26	6	generate and schedule podcast videos for all Alliance topic\ngenerating Test videos with new debate Prompt\nincrease notes credit logic improved\nadjust text size for Avatar component in RegistrationIllustration
e3bee61a-1b6d-44d5-9273-0ba1a4e1b5b1	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-28	7	Generate prompts for, Sumaries,intro,and AI overview insignts and created the pipeline to generate from the url automatically
12747465-409a-4100-a770-6bf5fb262fe9	e106b2f1-08c5-4eb3-8a19-c98900256f66	2026-01-29	2	worked on creating scripts videos/shorts on heygen
d1845b20-9f48-43ba-acd5-9d104b047ecb	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-08	8	Work on dev tickets related to Note Editor + family/couple improvement
4478a7fe-d621-42b7-b8e1-3403c66a7cbc	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-20	8	- finished the BDDs implement client transfer between team clinicians \n- deployed the ticket for QA on staging\n- started working on Improving waiting time indicators on generating note cards
19aa73b8-b223-45ad-847e-770f68775f3a	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-12	8	- worked on remaining dashboard ui fixes \n- work on align team member invite button behavior across onboarding and team management\n
be064e64-c573-406f-9eb3-cdd5b21efb64	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-13	8	-started working on Add TPs column to the clients table\n- merging PR \n- fixing BDDs\n- feedback from ICD meeting related to content length etc
e0216e7e-4765-4f7a-9351-81f9bdb3ae9d	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-14	8	- complete the dev work on Add TPs column to the client table\n- Work on the BDDs and ask Sam to review\n- Fixing Article Pipeline
bc89234b-6d16-4d4e-890c-6c3562f41edc	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-15	8	- fix the toast issue on align team member invite button after qa discovery \n- work on ICD article generation wording, new article outline
fc7adde5-301c-4544-9a7d-7612b2aa90af	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-16	8	- fix PR comments by copilot \n- started working on filter unification, \n- generating 5 articles for ICDs and sharing in the channel\n- fixed some of the BDDs
df6c9ae4-4280-4544-b1c4-f5c1323eacf3	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-19	8	- Worked on completing the Filter Unification \n- worked on Rename "Record Session" Back To "Record In-Person" On Mobile [High Priority]
96cfc37f-964d-4645-94e1-9f7d06f8111a	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-09	8	Fixed the Dashboard UI bugs + improvement moving group by outside and start to investigate the bug
505c85c9-7750-4191-8f87-8c38b57f8aec	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-05	8	work on fixing ICD issues related to CTA and test the updates
768e035f-1100-44cc-92be-3d3063f48b93	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-06	8	Work with Salem to deploy the changes + work on dev tickets
87323bd0-a886-41ab-994d-ce2dcfe3332b	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-07	8	Work on production bugs
00551f12-a785-4d3b-90cf-25c6203b333b	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-21	8	- Improving waiting time indicators on generating note cards (Completed)\n- Feature Request For Client Profile Transfer Between Team Clinicians [MCS-13142] (Completed along with QA Bugs)\n- dashboard session date filtering and ordering wip
c6a7ce47-0358-4fce-9fa1-debdad24e8b1	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-22	8	- merge PRs along with passing BDDs\n- rasied PR for Fix dashboard session date filtering and ordering along with its ts test cases (in depth)\nmeetings with Georgi & daily \n- fix CORS + add basic auth on swagger\n- support tickets + PR comments by copilot\n- bug fix Scroller is not working on roles terminology page\n- audit ux design of date picker\n- research the libraries what can we do, posted comment on notion
13d722d1-7d61-4da2-8236-44b31f9d7e04	765a4094-c53e-4555-a671-069289f47f4f	2026-02-02	6	- TransferToEHR Button integrate into Dashboard\n- Persona Choice alignment centered on mobile and tab\n- make tables rows clickable when user clicks on the margin/border area of the cell\n- sync all missing customerIO events with Mixpanel events (seat cancellation, summary,ehr, notes related)\n-Transfer to EHR button is not shown for unsaved notes
276a96fa-fc11-439c-b3b5-06dac6fe9e72	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-23	8	Security Updates:Backend:Added Swagger basic auth (production only)Restricted CORS to icd.mentalyc.com onlyImplemented rate limiting (50 req/60s per IP)Added Helmet security headersAdded API key guard (X-API-Key header required)Frontend:Auto-sends API key header in all requestsAdded 429 rate limit error handling
2ac91284-7ed0-4283-8bf4-624c668e6061	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-26	8	Fixed dashboard session data filtering and ordering (will be reviewed by Tobi)Fix UI Issues on website (in QA)currently observing and fixing BDDs related to Date Picker UI PR
4418afc0-da32-425b-8d0b-d45cc934b053	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-27	8	Worked on date picker, fixing issues on unify filter and PR comments on dashboard session PR awaiting BDDs
581a8c70-b9ab-4e44-91ba-8447f1279e99	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-28	8	Worked on the dev tickets, fixing QA issues and moving tickets to Ready for Deployment
82bc713b-18fa-4601-9336-66f76120e055	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-29	8	Worked on date picker enhanced validation, + R&D on telepath how it works and so on. + see the template + complete the code level changes for CS tickets, testing pending
4789c0ea-1ce9-41ba-9004-403d08edf72b	99b176c8-85a5-4082-b2a1-6b4694493b6c	2026-01-30	8	Worked on Add TP to tp page, + working on fixing conflicts and merging PRs
f74212cf-cc81-4667-ba38-5a3f39de3f67	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-02	4	feb
ca3d8dd7-4b54-4ba8-95f5-d8425091bcd4	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-10	4	fasdfa
55e2b0ab-ee09-430f-b463-8d33701ab730	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-03	4	- worked hard. 
cf15cbf5-db6b-4c9a-9ca2-038041720cdd	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-04	9	woked extra hard
d95f8ded-2b20-4da1-930c-e8c5f4d7551a	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-07	2	jjlk
cb1a9316-acf4-4acb-a1df-5d6fba1a59ae	fe5796bc-2330-4b22-99be-f6636af6f932	2026-02-13	5	worked 
0eb503c4-4b9e-4f29-85dc-cbebb4e69c8e	fe5796bc-2330-4b22-99be-f6636af6f932	2026-02-16	9	worked very hard.
455a04a9-cfd7-477e-af46-57efbe84cc1e	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-22	8	- Daily meeting\n- Sync with Naveen and unblock testing: \n-- Parakeet tests failing:Parakeet transcription failed due to CUDA error 35 during NeMo RNNT decoding.Model and audio chunking succeeded; failure occurred mid-inference.\n- Helped David on AWS side of reusable CI Docker image (GHCR/Docker Hub).\n- ICD bug fix for imran
475bc03f-abc5-4705-9738-e1e9f7bebf91	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-23	8	- Daily meeting\n- CI Optimization (supporting @David  Aniebo):Created and integrated a reusable Docker test environment image for E2E (Node 22, Playwright, xvfb, deps).Added workflow to build & publish image to ECR and consume it in E2E pipeline.\n- Parakeet pipeline:Synced with Naveen on CUDA error 35.Unblocked him on diarization-related errors.
545c523c-94de-4091-9879-6245b3928efc	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-26	8	- Daily meeting\n- Investigate DB queries spike and shared findings
cdc7a0fa-4d72-4aa4-bf08-acb75c6f72c4	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-19	8	- Daily meeting\n- Continued reliability work post-incident with @Oluwatobi.\n- Timestamp incongruence fix (milliseconds → seconds conversion before transcription) deployed\n- Fixed CORS issue post-deploy.Added a CI workflow so future merges to main auto-deploy without manual intervention.
a38bf762-12d6-4914-bb64-e9829cc7e6e6	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-02	8	Started working on production bugs assigned from other devs, fixed Sam's comments and merged PR
427ba831-f92c-4cdb-9ac4-ae94d3b9ac65	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-04	8	Worked on SQL findings, reverting PR for tps\nAdding client is not reflected immediately on SbS and worked on bug ticket
54e94806-185a-4c18-a3ef-099cdd65b9d8	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-03	8	Worked on bug tickets, merged the previous tickets and fixing
edd50e14-54aa-4259-95b3-8685a13759d4	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-05	8	Did analysis provided sql, did analysis for Bug team management Missing From "Active" Tab In Team Management 
bf920c30-53b2-4f99-8500-55e8d18cd9c5	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-06	8	fixing regression testing, + PR for add tps to client table\n
55dc125b-f0e1-422d-b902-aa19c0efd184	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-09	8	- Started working on Magic Edit\n- Working on fixing clients table \n- Work to fix some BDDs
08164613-b020-4001-85bf-7d786aeb7fc5	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-10	8	Worked on Production issues + starting magic edit
edb00e4c-fd51-4783-bc2c-1c4e4e1d678a	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-11	8	worked on db queries optimization readding add tps to client, and continue on FE of magic edit\n
35755dc3-1f82-47b9-a53e-44e6cc4c1f65	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-12	8	worked on Georgi's comment, audit of BE changes of magic edit, identified timezone issue, start work on it
ef73953a-396f-4666-99b6-eea1e0f87f5e	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-13	8	raised PR for timezone, continuing on the BE Todos of magic edit refactoring
5d31839b-19f5-44c8-822d-e7891e219702	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-19	8	Worked on Magic edit, did demo and taking a look what can we do for symptoms
5c822376-aed3-4d87-b4bf-1d61dc0a1930	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-20	8	symptoms carryover\nworking on related UI changes
d2c23c16-7f63-4127-b66f-bd7fbba57b1f	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-16	8	Magic edit, basic button hotspot, and sidepanel and working on preview panel
2a8fd617-1c2c-4945-ae7f-a8e9f833085e	158803b3-ef9b-4428-a700-4a601f80a02f	2026-02-17	8	fixed 4 production issues, raised PR and moving back to magic edit
e742d0c6-8ad1-446a-b5cf-978090c9ddcd	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-12	8	- Parakeet was running at 5% production traffic with stable performance metrics. A production issue was isolated to the Parakeet pipeline; traffic has been fully disabled\n- Worksheet App Debugging: Investigated intermittent article generation issues reported by Emmanuel; confirmed workflows complete successfully with fallback LLMs when some models fail due to missing API keys.\n- VPN / Access Issues: Assisted Emmanuel with staging access issues related to VPN connectivity.\n-Parakeet Pipeline Issue: Identified a time-unit handling bug affecting a subset of sessions, resulting in invalid timestamps.\nIssue confirmed to affect only the Parakeet pipeline; existing Whisper pipeline unaffected.
455eeb1a-d04b-46c7-a0b1-baf149ee8af2	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-13	8	- Daily meetings\n- Worked closely with Tobi and Sam on platform stability issues.\n- Deploy QA EHR backend environment for Sam.\n- Continued coordination with team members to unblock production workflows.\n- Access / VPN Issue (Emmanuel) - Resolved
f6231725-ed3d-4257-8a93-80538211a06a	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-14	8	- Daily meeting\n- Continued collaboration with Sam and Tobi on platform stability and reliability.Confirmed historical root cause of recent instability:Knex connection pool limitation (pool size = 6) was not an issue initially, but became problematic as query-heavy features were introduced.\n- Synced with Sam on EHR deployment expectations.\n- Parakeet timestamp incongruence bug: Fix deployed to convert chunk start times from milliseconds to seconds before transcription.
375f6bb6-c26b-49bc-bfea-99b524f57540	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-16	0	Sick leave
334e9e68-6ff0-4831-8342-5c06fe1b1f5b	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-20	8	- Daily meeting\n- Reliability investiagion with Georgi, and Tobi\n- Ran validation tests for the Parakeet timestamp fix.\nImplemented S3 lifecycle policy:\n   - Upload bucket(dev & prod) files now expire after 9 days.
4aa6e588-2da3-424e-8183-bd8bd971de40	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-21	8	- Daily meeting\n- BUG (non-existent user): Root cause found and fixed\n- Synced with Tobi to extract Sentry errors for timestamp bug to finish testing.
7668fbb8-afdf-402b-b0ae-8d98b952d188	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-15	0	- Sick leave
dcdbc4f3-686b-4285-b92d-4ea4e64ef229	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-05	8	- Parakeet test cluster validation post CUDA / NVIDIA library fix\n- ICD Article Generator Deployment: Deployed and stabilized FE + BE after Railway outage, resolving crashes, CORS, HTTPS, load balancer routing, and environment variable issues under urgent marketing timelines.\n- Grafana Security Incident: Remediated a live Grafana vulnerability (CVE-2025-4123) by blocking external access, patching Grafana, disabling risky plugins, and rotating credentials.\n- Failed Notes Issue (with Tobi)
52dc6418-6cda-4b33-8197-b82fc591da1e	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-06	8	- Failed Notes Investigation (with Tobi)\n- Parakeet Traffic split enabling and monitoring
02d8ba2b-6d45-487e-96de-c9efc6d54437	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-01	8	- Failed notes investigation (Ongoing Recording Issues for Couple Sessions)\n- Routing metrics monitoring
ad432a22-e329-43f8-9c4a-7bab408ab12f	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-02	8	- Sortformer diariastion pipeline bug fix (for Naveen)\n- Routine metrics monitoring
71f3e29c-5580-4364-8d35-a56cc55fc1ab	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-07	8	- Worksheet App: Backend deployed on ECS and frontend deployed to S3; SSL issued. Pending CloudFront setup, DNS records, final ALB rule, and end-to-end testing.\n- Diarisation testing script fix for Naveen\n- Failed Notes Issue: Session recordings shared with Tobi; 
e73f1bf2-c53b-48da-8250-3079f3dc86f3	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-08	8	- Parakeet production traffic monitoring\n- Bug fixes and redeployment (Worksheet App: Deployment completed and accessible at https://worksheet.mentalyc.com.)\n- @Salem)\nDiarisation Testing: Shared testing script with Naveen
a2f2c8d6-9a6a-47f2-a028-f91a0efbe532	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-09	8	- Daily meeting \n- Parakeet monitoring (numbers were good, but note failures raised suspicion)\n- Prod Preview Environment pipeline debug for Fix saved recordings creation PR
7614da9a-0034-49b6-8486-6a6924e415c1	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-27	8	- Daily meeting\n- VPN issues debugging for Tobi\n- Continued DB queries spike investigation
e5b90756-b5f0-41e2-b3d3-180a4f010c33	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-28	8	- Daily meeting\n- Parakeet pipeline / timestamp investigation:Added duration logging to validate timestamp fix, but uncovered a blocker:\nPostprocessing fails due to punctuation model incompatibility with current transformers version.Error: grouped_entities deprecated in newer transformers.\n- Added missing env vars to the worksheet app.Created deployment workflow (auto-deploy on main).
dd058ca8-d011-4f90-8d41-0a010c851b43	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-29	8	- Daily meeting\n- ParakeetTimestamp bug root cause investigation and fix
84bfa6df-89a4-4cc5-bd36-5009bcba8795	e3cf3eba-aac9-4b94-b37e-026d990964e7	2026-01-30	8	- Daily meeting\n- ParakeetTimestamp bug root cause identified:Root cause wasn't micro vs milliseconds, but double offsetting\n- S3 / Observability:\n set up event nofication to lambda integration for Parakeet pipeline failure reporting
\.


--
-- Data for Name: evaluation_sections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.evaluation_sections (id, evaluation_id, section_number, section_name, question, self_rating, self_documentation, improvement_goal, manager_rating, manager_feedback, founder_feedback) FROM stdin;
3197dde3-3e0c-43fa-99f8-f01220967293	e4c9edb9-aa26-45db-b77d-741fe7f10d70	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	\N	\N	\N	\N	\N	\N
db0ae523-b318-4b0a-8f0e-cc99918eda5e	e4c9edb9-aa26-45db-b77d-741fe7f10d70	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	\N	\N	\N	\N	\N	\N
03871325-2edd-4fad-acd1-05162fa29611	e4c9edb9-aa26-45db-b77d-741fe7f10d70	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	\N	\N	\N	\N	\N	\N
b2366750-23b0-46f1-895b-3f952c724c81	e4c9edb9-aa26-45db-b77d-741fe7f10d70	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	\N	\N	\N	\N	\N	\N
547a6820-0cd4-4d24-8271-0a32e80df098	e4c9edb9-aa26-45db-b77d-741fe7f10d70	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	\N	\N	\N	\N	\N	\N
d5283f41-b3fb-4666-af8b-c1fbfe0b0709	e4c9edb9-aa26-45db-b77d-741fe7f10d70	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	\N	\N	\N	\N	\N	\N
8e4d950d-d63e-4009-8218-4d219c83daa6	4bb9b74b-ce2e-4e3b-9895-c0941147e2e1	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	\N	\N	\N	\N	\N	\N
7f5d28cd-47ad-4787-ac2b-e52b1ea1fb24	4bb9b74b-ce2e-4e3b-9895-c0941147e2e1	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	\N	\N	\N	\N	\N	\N
8162242e-aabf-4f2a-8119-8795184c385e	4bb9b74b-ce2e-4e3b-9895-c0941147e2e1	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	\N	\N	\N	\N	\N	\N
607fe1f5-7b73-4267-887f-a10033ce4c74	4bb9b74b-ce2e-4e3b-9895-c0941147e2e1	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	\N	\N	\N	\N	\N	\N
85768108-8f13-4060-a950-358439b816cb	4bb9b74b-ce2e-4e3b-9895-c0941147e2e1	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	\N	\N	\N	\N	\N	\N
7abc4a1b-5823-4512-8a97-b8cece8c6196	4bb9b74b-ce2e-4e3b-9895-c0941147e2e1	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	\N	\N	\N	\N	\N	\N
b1b45a94-ea05-46ae-9cc4-2c93c74e2ec2	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	4	Completed key deliverables for section 3	Improve process and reduce turnaround for section 3.	3	nice	nice
0188972c-5d8a-495a-8848-a6211bf8621b	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	4	Completed key deliverables for section 6	Improve process and reduce turnaround for section 6.	3		
f7006b06-3014-46d5-93ec-5d7379845e16	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	4	Completed key deliverables for section 2	Improve process and reduce turnaround for section 2.	4	actually good	nice
1ae5119b-2a53-483a-a649-9a41b9843531	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	4	Completed key deliverables	Improve process and reduce turnaround for section 1.	3	Test manager feedback	
fe1e158a-f0f9-4467-b5fd-872210e48da7	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	4	Completed key deliverables for section 4	Improve process and reduce turnaround for section 4.	2	not that much	
0dfd2db7-271f-44aa-9edb-fb985e254376	57d32d60-a72a-47d8-b24c-e6374fa53cfa	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	\N	\N	\N	\N	\N	\N
e40f6883-b09c-4f01-b372-89dc5b6b9657	57d32d60-a72a-47d8-b24c-e6374fa53cfa	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	\N	\N	\N	\N	\N	\N
31472d0e-fbc1-4199-86df-7e1409d541d2	57d32d60-a72a-47d8-b24c-e6374fa53cfa	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	\N	\N	\N	\N	\N	\N
22c98e15-806a-4669-a5a5-5e224f564320	57d32d60-a72a-47d8-b24c-e6374fa53cfa	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	\N	\N	\N	\N	\N	\N
9919fa89-150b-4dcf-81b5-87884154652c	57d32d60-a72a-47d8-b24c-e6374fa53cfa	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	\N	\N	\N	\N	\N	\N
0b4357f5-6e58-471a-a7b3-d9fc128eb964	57d32d60-a72a-47d8-b24c-e6374fa53cfa	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	\N	\N	\N	\N	\N	\N
046acb6f-f7d3-42ef-a1a6-8bf864bf10f6	f5c17618-4777-435b-bcb8-5e583d8767e2	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	\N	\N	\N	\N	\N	\N
00b97818-e3ae-4e2d-9d89-09b2d3b13c75	f5c17618-4777-435b-bcb8-5e583d8767e2	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	\N	\N	\N	\N	\N	\N
62d0466f-a39f-4cc2-b621-0a854473662a	f5c17618-4777-435b-bcb8-5e583d8767e2	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	\N	\N	\N	\N	\N	\N
9e59ebe1-b825-4991-b7f5-5eb385cc72a4	f5c17618-4777-435b-bcb8-5e583d8767e2	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	\N	\N	\N	\N	\N	\N
41089126-d2c6-4397-9e09-c2b8f3abe36e	f5c17618-4777-435b-bcb8-5e583d8767e2	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	\N	\N	\N	\N	\N	\N
9e69af83-e62e-4f16-bcc8-0ff8b7f2a2d9	f5c17618-4777-435b-bcb8-5e583d8767e2	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	\N	\N	\N	\N	\N	\N
6216c8f7-d2f3-453a-97f2-b7dff815d8b6	804c0257-6160-47a4-9e33-7f7fd272bb79	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	4	cool	cool	2	nice	nice
e5f781cf-cbe3-4cb5-b75d-3f3e125dbba5	804c0257-6160-47a4-9e33-7f7fd272bb79	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	3	cool	cool	2	nice	nice
cb4c5db8-255b-406b-af5d-170a6170d427	804c0257-6160-47a4-9e33-7f7fd272bb79	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	4	cool	cool	2	nice	nice
f153feb0-c16c-4028-a908-efa3eecf6696	804c0257-6160-47a4-9e33-7f7fd272bb79	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	3	cool	cool	3	nice	nice
b987b758-e840-4238-851d-0bc6ddf110c3	804c0257-6160-47a4-9e33-7f7fd272bb79	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	4	cool	cool	4	nice	nice
fc08a15d-cdb0-467f-a007-b5b474927959	804c0257-6160-47a4-9e33-7f7fd272bb79	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	3	cool	cool	2	nice	nice
251e267f-e476-46d5-841d-5ad1cc795e1e	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	4	Completed key deliverables for section 5	Improve process and reduce turnaround for section 5.	3		
7dcec3e5-968b-4fba-a6d8-888ebd40175b	756b83de-ddae-4911-bc88-e100587928a6	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	3	dasfa	adfa	\N	\N	\N
fc26a935-1638-4e87-96a5-56136bdfaec2	756b83de-ddae-4911-bc88-e100587928a6	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	2	adfaaf	adfaaf	\N	\N	\N
c9a9e5e0-e68f-475e-959d-fd6876d11e6c	756b83de-ddae-4911-bc88-e100587928a6	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	3	adfaaf	adfaaf	\N	\N	\N
53894114-f272-45bd-b189-e1594e9888c6	6650ddbc-ac4e-487d-895c-0fea1089b306	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	\N	\N	\N	\N	\N	\N
283ef5a3-985c-4977-b65c-da7a47c1c4dc	6650ddbc-ac4e-487d-895c-0fea1089b306	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	\N	\N	\N	\N	\N	\N
92d9d47f-d9c8-4238-9c70-ece2abc7a0ab	6650ddbc-ac4e-487d-895c-0fea1089b306	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	\N	\N	\N	\N	\N	\N
e3fec792-797a-4ef4-b074-54652fac8004	756b83de-ddae-4911-bc88-e100587928a6	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	3	adfa	adfa	3	\N	\N
a2b21a6e-c568-4477-9720-83a6401a974c	756b83de-ddae-4911-bc88-e100587928a6	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	2	adfaaf	adfaaf	\N	\N	\N
84621791-d995-4889-9a8b-4716f9d770e9	756b83de-ddae-4911-bc88-e100587928a6	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	4	adfaaf	adfaaf	\N	\N	\N
c64ab796-392d-49f8-9157-272becf5294a	6650ddbc-ac4e-487d-895c-0fea1089b306	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	\N	\N	\N	\N	\N	\N
f7f899aa-669c-4ecd-9123-e0ba11393a94	6650ddbc-ac4e-487d-895c-0fea1089b306	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	\N	\N	\N	\N	\N	\N
cb6ca8b3-d0cc-418b-87ab-a2d43668e7a3	6650ddbc-ac4e-487d-895c-0fea1089b306	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: evaluations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.evaluations (id, ic_id, manager_id, period_start, period_end, experience_level_at_eval, new_experience_level, overall_self_rating, overall_manager_rating, expectations_for_next_review, manager_summary, status, created_at, ic_submitted_at, manager_submitted_at, completed_at, overall_score, outcomes) FROM stdin;
57d32d60-a72a-47d8-b24c-e6374fa53cfa	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	2026-01-01	2026-03-31	\N	\N	\N	\N	\N	\N	draft	2026-01-03 00:14:27.122273	\N	\N	\N	\N	\N
f5c17618-4777-435b-bcb8-5e583d8767e2	be1a274a-663c-45db-952c-bf75d8df53b6	6f3bbf1e-57c9-4914-88e6-390ce48668c1	2025-11-01	2026-01-02	\N	\N	\N	\N	\N	\N	draft	2026-01-03 13:58:08.985513	\N	\N	\N	\N	\N
804c0257-6160-47a4-9e33-7f7fd272bb79	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	2026-01-01	2026-01-02	\N	2	\N	\N	nicenice	nicenicenicenicenice	completed	2026-01-03 14:39:10.582568	2026-01-03 14:44:50.478	2026-01-03 14:47:18.029	2026-01-03 14:47:18.029	\N	\N
d9aa3d85-6fbe-4c2f-b860-87d35bee7093	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	2026-01-01	2026-03-31	\N	2	\N	\N	be on time.	good, try more next time.	completed	2026-01-03 00:08:50.111993	2026-01-03 00:16:32.508	2026-01-03 15:02:31.9	2026-01-03 15:02:31.9	3	{raise,bonus}
756b83de-ddae-4911-bc88-e100587928a6	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-01	2026-02-28	\N	4	\N	\N			completed	2026-02-04 12:02:48.882405	2026-02-04 12:04:09.242	2026-02-04 12:05:14.428	2026-02-04 12:05:14.428	3	{raise,bonus,title_change,demoted,terminated}
6650ddbc-ac4e-487d-895c-0fea1089b306	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2025-12-02	2026-02-12	\N	\N	\N	\N	\N	\N	draft	2026-02-04 12:26:18.843308	\N	\N	\N	\N	\N
\.


--
-- Data for Name: feedback_invitations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.feedback_invitations (id, evaluation_id, invited_by_id, invited_user_id, feedback, rating, status, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: ic_payment_details; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ic_payment_details (id, user_id, bank_name, account_holder_first_name, account_holder_last_name, account_number, routing_number, swift_code, iban_number, account_type, address, updated_at) FROM stdin;
8c7250c2-81ec-44dc-9a06-629cef8eca67	74e619cf-48e9-44b5-a7f9-93f813d7bedf	Meezan Bank Ltd	Adeel	Atta	PK92MEZN0098890104668309		MEZNPKKA	PK92MEZN0098890104668309	checking	Naushahro Feroze	2026-01-30 11:29:31.19701
\.


--
-- Data for Name: ic_responsibilities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ic_responsibilities (id, ic_id, responsibility, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: invoice_line_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoice_line_items (id, invoice_id, description, quantity, rate, total, sort_order) FROM stdin;
21a85195-371d-4682-8983-eb3e1671e12f	3ef7aa5e-a483-4b0a-bdc2-99c73703c469	Consulting services	10	7500	75000	0
ac6dee96-1158-47aa-bbea-e68c695ac9e8	a91d15e5-c760-4c4c-a398-be88ce43adfd	frontend web development 	83	1200	99600	0
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoices (id, user_id, invoice_number, month, year, issue_date, file_name, file_url, amount, subtotal, contractor_name, contractor_address, contractor_phone, contractor_email, contractor_vat_no, bill_to_name, bill_to_address, bill_to_vat_no, bank_details, uploaded_at, status, reviewed_by, reviewed_at, review_note, timesheet_id) FROM stdin;
fec44490-9f1c-4702-a7ed-09e9c63ba751	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	UPLOAD-1768555401348	1	2026	2026-01-16	Invoice-Malik_Demo-January-2026.png	/objects/uploads/24f0518a-68ec-42e3-b0ae-89703bdf5164	100000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-16 09:23:24.747216	rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-02 08:01:24.876	demo	433c15f3-3032-414e-be6b-5f46da190c39
3ef7aa5e-a483-4b0a-bdc2-99c73703c469	be1a274a-663c-45db-952c-bf75d8df53b6	INV-2026-002	1	2026	2026-01-03	Invoice-Alex_Johnson-INV-2026-002-January-2026.pdf	data:application/pdf;base64,JVBERi0xLjMKJbrfrOAKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUuMjc5OTk5OTk5OTk5OTcyNyA4NDEuODg5OTk5OTk5OTk5OTg2NF0KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggMjU3Ngo+PgpzdHJlYW0KMC41NjcwMDAwMDAwMDAwMDAxIHcKMCBHCkJUCi9GMSAyNCBUZgoyNy41OTk5OTk5OTk5OTk5OTc5IFRMCjAuMTE4IDAuMjI3IDAuMzczIHJnCjU2LjY5MjkxMzM4NTgyNjc3NzUgNzg1LjE5NzA4NjYxNDE3MzI1ODYgVGQKKElOVk9JQ0UpIFRqCkVUCkJUCi9GMSAxMCBUZgoxMS41IFRMCjAuMiBnCjQ2MC4wODcwODY2MTQxNzMxMzEyIDc4NS4xOTcwODY2MTQxNzMyNTg2IFRkCihEYXRlOiBKYW4gMywgMjAyNikgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKNDI0LjI4NzA4NjYxNDE3MzExOTkgNzY4LjE4OTIxMjU5ODQyNTIyODkgVGQKKEludm9pY2UgTm86IElOVi0yMDI2LTAwMikgVGoKRVQKQlQKL0YxIDggVGYKOS4xOTk5OTk5OTk5OTk5OTkzIFRMCjAuNCBnCjU2LjY5MjkxMzM4NTgyNjc3NzUgNzExLjQ5NjI5OTIxMjU5ODM4NzQgVGQKKENPTlRSQUNUT1IpIFRqCkVUCkJUCi9GMSA4IFRmCjkuMTk5OTk5OTk5OTk5OTk5MyBUTAowLjQgZwozMTEuODExMDIzNjIyMDQ3Mjg3MSA3MTEuNDk2Mjk5MjEyNTk4Mzg3NCBUZAooQklMTCBUTykgVGoKRVQKQlQKL0YyIDEwIFRmCjExLjUgVEwKMC4yIGcKNTYuNjkyOTEzMzg1ODI2Nzc3NSA2OTQuNDg4NDI1MTk2ODUwMzU3NyBUZAooQWxleCBKb2huc29uKSBUagpFVApCVAovRjIgMTAgVGYKMTEuNSBUTAowLjIgZwozMTEuODExMDIzNjIyMDQ3Mjg3MSA2OTQuNDg4NDI1MTk2ODUwMzU3NyBUZAooTWVudGFseWMgSW5jLikgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKNTYuNjkyOTEzMzg1ODI2Nzc3NSA2NjguOTc2NjE0MTczMjI4MzEzMSBUZAooRW1haWw6IGljQG1lbnRhbHljLmNvbSkgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKMzExLjgxMTAyMzYyMjA0NzI4NzEgNjgwLjMxNTE5Njg1MDM5MzcwNDIgVGQKKDIyNjEgTWFya2V0IFN0cmVldCAjNDU2OSkgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKMzExLjgxMTAyMzYyMjA0NzI4NzEgNjY4Ljk3NjYxNDE3MzIyODMxMzEgVGQKKFNhbiBGcmFuY2lzY28gQ0EgOTQxMTQpIFRqCkVUCjAuMTIgMC4yMyAwLjM3IHJnCjU2LjY5MjkxMzM4NTgyNjc3NzUgNjI5LjI5MTU3NDgwMzE0OTYxNSA0ODEuODk0MTczMjI4MzQ2NDAzNCAtMjIuNjc3MTY1MzU0MzMwNzExIHJlCmYKQlQKL0YxIDkgVGYKMTAuMzQ5OTk5OTk5OTk5OTk5NiBUTAoxLiBnCjYyLjM2MjIwNDcyNDQwOTQ1MTcgNjEzLjcwMTAyMzYyMjA0NzE1OTcgVGQKKERlc2NyaXB0aW9uKSBUagpFVApCVAovRjEgOSBUZgoxMC4zNDk5OTk5OTk5OTk5OTk2IFRMCjEuIGcKMzQwLjE1NzQ4MDMxNDk2MDY1MSA2MTMuNzAxMDIzNjIyMDQ3MTU5NyBUZAooUXR5KSBUagpFVApCVAovRjEgOSBUZgoxMC4zNDk5OTk5OTk5OTk5OTk2IFRMCjEuIGcKNDExLjAyMzYyMjA0NzI0NDE0NiA2MTMuNzAxMDIzNjIyMDQ3MTU5NyBUZAooUmF0ZSkgVGoKRVQKQlQKL0YxIDkgVGYKMTAuMzQ5OTk5OTk5OTk5OTk5NiBUTAoxLiBnCjUxMy4wMjc3OTUyNzU1OTA1MDYyIDYxMy43MDEwMjM2MjIwNDcxNTk3IFRkCihUb3RhbCkgVGoKRVQKQlQKL0YxIDkgVGYKMTAuMzQ5OTk5OTk5OTk5OTk5NiBUTAowLjIgZwo2Mi4zNjIyMDQ3MjQ0MDk0NTE3IDU5NS4yNzU4MjY3NzE2NTM1NTU2IFRkCihDb25zdWx0aW5nIHNlcnZpY2VzKSBUagpFVApCVAovRjEgOSBUZgoxMC4zNDk5OTk5OTk5OTk5OTk2IFRMCjAuMiBnCjM0MC4xNTc0ODAzMTQ5NjA2NTEgNTk1LjI3NTgyNjc3MTY1MzU1NTYgVGQKKDEwKSBUagpFVApCVAovRjEgOSBUZgoxMC4zNDk5OTk5OTk5OTk5OTk2IFRMCjAuMiBnCjQxMS4wMjM2MjIwNDcyNDQxNDYgNTk1LjI3NTgyNjc3MTY1MzU1NTYgVGQKKCQ3NS4wMCkgVGoKRVQKQlQKL0YxIDkgVGYKMTAuMzQ5OTk5OTk5OTk5OTk5NiBUTAowLjIgZwo1MDAuNjk3Nzk1Mjc1NTkwNDY1MyA1OTUuMjc1ODI2NzcxNjUzNTU1NiBUZAooJDc1MC4wMCkgVGoKRVQKMC45IEcKNTYuNjkyOTEzMzg1ODI2Nzc3NSA1ODkuNjA2NTM1NDMzMDcwODAzMyBtCjUzOC41ODcwODY2MTQxNzMxMzEyIDU4OS42MDY1MzU0MzMwNzA4MDMzIGwKUwpCVAovRjEgMTAgVGYKMTEuNSBUTAowLjIgZwo0MjUuMjAxMjU5ODQyNTE5NjE4OCA1NDQuMjUyMjA0NzI0NDA5NDY2NSBUZAooU3ViLVRvdGFsOikgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKNDk3LjExNzc5NTI3NTU5MDUzOCA1NDQuMjUyMjA0NzI0NDA5NDY2NSBUZAooJDc1MC4wMCkgVGoKRVQKMC4xMiAwLjIzIDAuMzcgUkcKMzY4LjUwODM0NjQ1NjY5MjgzNDIgNTI3LjI0NDMzMDcwODY2MTMyMzEgbQo1MzguNTg3MDg2NjE0MTczMTMxMiA1MjcuMjQ0MzMwNzA4NjYxMzIzMSBsClMKQlQKL0YyIDEyIFRmCjEzLjc5OTk5OTk5OTk5OTk5ODkgVEwKMC4xMTggMC4yMjcgMC4zNzMgcmcKNDI1LjIwMTI1OTg0MjUxOTYxODggNTEwLjIzNjQ1NjY5MjkxMzM1MDMgVGQKKEJhbGFuY2UgRHVlOikgVGoKRVQKQlQKL0YyIDEyIFRmCjEzLjc5OTk5OTk5OTk5OTk5ODkgVEwKMC4xMTggMC4yMjcgMC4zNzMgcmcKNDg5Ljk1Nzc5NTI3NTU5MDUxMyA1MTAuMjM2NDU2NjkyOTEzMzUwMyBUZAooJDc1MC4wMCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoxIDAgb2JqCjw8L1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUiBdCi9Db3VudCAxCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvSGVsdmV0aWNhCi9TdWJ0eXBlIC9UeXBlMQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwovRmlyc3RDaGFyIDMyCi9MYXN0Q2hhciAyNTUKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZAovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUKL1N1YnR5cGUgL1R5cGUxCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCi9GaXJzdENoYXIgMzIKL0xhc3RDaGFyIDI1NQo+PgplbmRvYmoKOCAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkT2JsaXF1ZQovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iago5IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvQ291cmllcgovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iagoxMCAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL0NvdXJpZXItQm9sZAovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iagoxMSAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL0NvdXJpZXItT2JsaXF1ZQovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iagoxMiAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL0NvdXJpZXItQm9sZE9ibGlxdWUKL1N1YnR5cGUgL1R5cGUxCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCi9GaXJzdENoYXIgMzIKL0xhc3RDaGFyIDI1NQo+PgplbmRvYmoKMTMgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL0Jhc2VGb250IC9UaW1lcy1Sb21hbgovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iagoxNCAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL1RpbWVzLUJvbGQKL1N1YnR5cGUgL1R5cGUxCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCi9GaXJzdENoYXIgMzIKL0xhc3RDaGFyIDI1NQo+PgplbmRvYmoKMTUgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL0Jhc2VGb250IC9UaW1lcy1JdGFsaWMKL1N1YnR5cGUgL1R5cGUxCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCi9GaXJzdENoYXIgMzIKL0xhc3RDaGFyIDI1NQo+PgplbmRvYmoKMTYgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL0Jhc2VGb250IC9UaW1lcy1Cb2xkSXRhbGljCi9TdWJ0eXBlIC9UeXBlMQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwovRmlyc3RDaGFyIDMyCi9MYXN0Q2hhciAyNTUKPj4KZW5kb2JqCjE3IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvWmFwZkRpbmdiYXRzCi9TdWJ0eXBlIC9UeXBlMQovRmlyc3RDaGFyIDMyCi9MYXN0Q2hhciAyNTUKPj4KZW5kb2JqCjE4IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvU3ltYm9sCi9TdWJ0eXBlIC9UeXBlMQovRmlyc3RDaGFyIDMyCi9MYXN0Q2hhciAyNTUKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1Byb2NTZXQgWy9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUldCi9Gb250IDw8Ci9GMSA1IDAgUgovRjIgNiAwIFIKL0YzIDcgMCBSCi9GNCA4IDAgUgovRjUgOSAwIFIKL0Y2IDEwIDAgUgovRjcgMTEgMCBSCi9GOCAxMiAwIFIKL0Y5IDEzIDAgUgovRjEwIDE0IDAgUgovRjExIDE1IDAgUgovRjEyIDE2IDAgUgovRjEzIDE3IDAgUgovRjE0IDE4IDAgUgo+PgovWE9iamVjdCA8PAo+Pgo+PgplbmRvYmoKMTkgMCBvYmoKPDwKL1Byb2R1Y2VyIChqc1BERiAzLjAuNCkKL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDEwMzE3MDgwMS0wMCcwMCcpCj4+CmVuZG9iagoyMCAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMSAwIFIKL09wZW5BY3Rpb24gWzMgMCBSIC9GaXRIIG51bGxdCi9QYWdlTGF5b3V0IC9PbmVDb2x1bW4KPj4KZW5kb2JqCnhyZWYKMCAyMQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDI3ODAgMDAwMDAgbiAKMDAwMDAwNDU5NyAwMDAwMCBuIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxNTIgMDAwMDAgbiAKMDAwMDAwMjgzNyAwMDAwMCBuIAowMDAwMDAyOTYyIDAwMDAwIG4gCjAwMDAwMDMwOTIgMDAwMDAgbiAKMDAwMDAwMzIyNSAwMDAwMCBuIAowMDAwMDAzMzYyIDAwMDAwIG4gCjAwMDAwMDM0ODUgMDAwMDAgbiAKMDAwMDAwMzYxNCAwMDAwMCBuIAowMDAwMDAzNzQ2IDAwMDAwIG4gCjAwMDAwMDM4ODIgMDAwMDAgbiAKMDAwMDAwNDAxMCAwMDAwMCBuIAowMDAwMDA0MTM3IDAwMDAwIG4gCjAwMDAwMDQyNjYgMDAwMDAgbiAKMDAwMDAwNDM5OSAwMDAwMCBuIAowMDAwMDA0NTAxIDAwMDAwIG4gCjAwMDAwMDQ4NDUgMDAwMDAgbiAKMDAwMDAwNDkzMSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDIxCi9Sb290IDIwIDAgUgovSW5mbyAxOSAwIFIKL0lEIFsgPEFFMUJGOTI3MEJCMTQ4RUZBOTAzMjFFRjlCOEZEMkNDPiA8QUUxQkY5MjcwQkIxNDhFRkE5MDMyMUVGOUI4RkQyQ0M+IF0KPj4Kc3RhcnR4cmVmCjUwMzUKJSVFT0Y=	75000	75000	Alex Johnson			ic@mentalyc.com	\N	Mentalyc Inc.	2261 Market Street #4569\nSan Francisco CA 94114	\N	\N	2026-01-03 17:08:01.129643	rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-02 08:01:33.212	demo	\N
4fb1d253-9883-44ca-b917-8afe97d29e6d	be1a274a-663c-45db-952c-bf75d8df53b6	INV-2026-001	1	2026	2026-01-15	invoice_jan_2026.pdf	/uploads/invoice_jan_2026.pdf	112500	112500	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-02 22:37:14.907723	rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-02 08:01:39.031	demo	\N
c854ca4c-dc7a-4d90-86c3-867abca8771c	05cb123d-2241-4695-88cd-e2969d2a22ef	UPLOAD-1770024920492	1	2026	2026-02-02	Invoice-Salem_Daniel-January-2026.pdf	/objects/uploads/effdf60a-4294-45a1-aa1f-221d31cdce7f	416000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-02 09:35:33.788975	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-03 15:56:22.148	\N	e3cf3eba-aac9-4b94-b37e-026d990964e7
65dce3b2-a439-4ac5-b4da-cb3c155ba1b6	de794e37-6ef0-4e4c-b121-904de280aa38	UPLOAD-1769960147596	1	2026	2026-02-01	Invoice-Imran_Zahoor-January-2026.pdf	/objects/uploads/80ad5abc-72bb-420e-9bf1-336b096d7a9c	277600	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-01 15:35:48.551996	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-03 15:56:26.368	\N	99b176c8-85a5-4082-b2a1-6b4694493b6c
a91d15e5-c760-4c4c-a398-be88ce43adfd	74e619cf-48e9-44b5-a7f9-93f813d7bedf	INV-2026-001	1	2026	2026-01-30	Invoice-Adeel_Atta-INV-2026-001-January-2026.pdf	/objects/uploads/82c4cee3-7dbb-4218-a42e-495a4e9b17d1	99600	99600	Adeel Atta	Naushahro Feroze	+923032727095	adeelatta2000@gmail.com	\N	Mentalyc Inc.	2261 Market Street #4569\nSan Francisco CA 94114	\N	Name: Adeel Atta\nBank: Meezan Bank Ltd\nSWIFT: MEZNPKKA\nIBAN: PK92MEZN0098890104668309\nAccount: PK92MEZN0098890104668309\nType: checking\nAddress: Naushahro Feroze	2026-01-30 11:30:11.268125	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-03 15:58:20.183	\N	e106b2f1-08c5-4eb3-8a19-c98900256f66
f5d38278-c7b7-48d5-8686-ad57ee6b804d	2998c744-43bb-4633-86a1-80d576c52931	UPLOAD-1770282570333	1	2026	2026-02-05	Invoice-Emmanuel_Agba-January-2026.pdf	/objects/uploads/10e3d20c-5d7d-4777-99c4-a84ddbecf848	268800	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-05 09:09:31.454341	pending_review	\N	\N	\N	466401e1-e47a-474d-8d7d-937db22d39f8
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notification_preferences (id, user_id, in_app_enabled, email_enabled, ooo_notifications, timesheet_notifications, overtime_notifications, invoice_notifications, deadline_reminders, evaluation_notifications, team_action_notifications) FROM stdin;
44d8193d-1e46-4ebf-950d-aa4f96716e7f	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	t	f	t	t	t	t	t	t	t
eb6e71ef-f42e-423d-9062-d2316361475e	test-supervisor-001	t	f	t	t	t	t	t	t	t
c7d6cecd-3900-48a0-9fee-3a4df613ceb0	test-ic-user-001	t	f	t	t	t	t	t	t	t
82db1287-04be-4642-a5e7-514dc4c2f81d	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	t	t	t	t	t	t	t	t	t
ccf87786-ea5d-449d-8aeb-cedef009954b	d264c297-6dd7-42c7-ad80-1c4eda70cac2	t	t	t	t	t	t	t	t	t
5f07b53d-02b3-4cf0-9f5e-feb6ae5e60d4	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	t	f	t	t	t	t	t	t	t
f20043a2-beda-481b-9cf6-fe0a33e66f71	74e619cf-48e9-44b5-a7f9-93f813d7bedf	t	f	t	t	t	t	t	t	t
e139c399-aea0-4242-b7af-e778848b85b5	2998c744-43bb-4633-86a1-80d576c52931	t	f	t	t	t	t	t	t	t
4c15fb35-1a36-4aff-884e-e1dd01672c3d	de794e37-6ef0-4e4c-b121-904de280aa38	t	f	t	t	t	t	t	t	t
cab2360d-9511-4daa-baa6-e0cbaba277d5	a23598e5-97e2-4a34-a052-6aa30e11d92b	t	f	t	t	t	t	t	t	t
e271f4d0-fb35-4321-87da-9db5df52cdbe	be1a274a-663c-45db-952c-bf75d8df53b6	t	t	t	t	t	t	t	t	t
9cbcee03-4351-4b80-9cc5-ece702b3ae47	05cb123d-2241-4695-88cd-e2969d2a22ef	t	t	t	t	t	t	t	t	t
1773cf70-9630-4cf4-8c92-574ce3b01162	82defca1-4380-4327-a959-474de43bf1dc	t	t	t	t	t	t	t	t	t
65085474-cf3c-4890-829b-90f4fe50e5aa	63552eff-f6aa-473e-92bc-957991d3505d	t	t	t	t	t	t	t	t	t
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, actor_id, type, title, message, entity_type, entity_id, is_read, created_at) FROM stdin;
678ba875-41b7-4f08-b109-1118dcf125ab	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	ooo_rejected	OOO Request Rejected	Your OOO request was rejected: Request conflicts with project deadline	ooo_request	c659aa80-746e-4332-ab41-7bf81e7d5e5b	f	2026-01-02 23:39:54.631063
bae9aa5d-b2aa-43ff-a489-60548346ba25	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	timesheet_approved	Timesheet Approved	Your timesheet has been approved by Michael Chen	timesheet	5a598c91-2a7d-42b1-9025-71a4a6188e75	f	2026-01-02 23:51:26.102311
cd54560b-97fc-4504-8b46-9c80933b188e	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	ooo_approved	OOO Request Approved	Your OOO request has been approved by Michael Chen	ooo_request	2dafd073-d009-46dc-a949-b95174b22590	f	2026-01-02 23:32:29.098113
b7e726d8-9bfd-4b8c-ae26-86aa18531b1c	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	timesheet_rejected	Timesheet Rejected	Your timesheet was rejected: Missing activity details for several days	timesheet	4d3c9749-2a9e-4427-8f63-2cc80b818d16	f	2026-01-02 23:57:05.803392
ea13ed40-ac66-4456-b293-368d2318f55b	726502da-d264-4140-a79d-9876ddf20410	82defca1-4380-4327-a959-474de43bf1dc	timesheet_submitted	Timesheet Submitted for Review	Michael Chen submitted their timesheet for review	timesheet	9312931e-be96-4e23-975f-ac9014feb0e7	f	2026-01-02 23:58:43.745907
7ac5f065-95fb-478b-8321-ac87d3734f15	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	overtime_approved	Overtime Request Approved	Your overtime request was approved: 10 hours	overtime_request	3b04974c-41f8-4bc6-adf5-62b854bce5e8	f	2026-01-03 00:06:37.859676
053133a3-ee56-45f2-996a-de0e6b9c45fa	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	evaluation_created	New Performance Evaluation	A new performance evaluation has been created for you. Please complete your self-assessment.	evaluation	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	f	2026-01-03 00:08:50.155845
3b376b77-6a14-43ca-9cda-e8c9b068ff70	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	evaluation_created	New Performance Evaluation	A new performance evaluation has been created for you. Please complete your self-assessment.	evaluation	57d32d60-a72a-47d8-b24c-e6374fa53cfa	f	2026-01-03 00:14:27.180703
a4fa52c7-6c11-4845-915c-4a9ac2973891	be1a274a-663c-45db-952c-bf75d8df53b6	6f3bbf1e-57c9-4914-88e6-390ce48668c1	evaluation_created	New Performance Evaluation	A new performance evaluation has been created for you. Please complete your self-assessment.	evaluation	f5c17618-4777-435b-bcb8-5e583d8767e2	f	2026-01-03 13:58:09.050118
239e7dca-47d5-4a26-9583-2e04eb9a4f34	82defca1-4380-4327-a959-474de43bf1dc	be1a274a-663c-45db-952c-bf75d8df53b6	timesheet_submitted	Timesheet Submitted for Review	Alex Johnson submitted their timesheet for review	timesheet	5a598c91-2a7d-42b1-9025-71a4a6188e75	t	2026-01-02 23:42:56.251697
5bb07441-cce8-43d0-a390-f8b64d079748	82defca1-4380-4327-a959-474de43bf1dc	be1a274a-663c-45db-952c-bf75d8df53b6	timesheet_submitted	Timesheet Submitted for Review	Alex Johnson submitted their timesheet for review	timesheet	4d3c9749-2a9e-4427-8f63-2cc80b818d16	t	2026-01-02 23:55:51.761765
d7d4ba0f-b74a-4814-a22d-4f5bd5d1b2de	82defca1-4380-4327-a959-474de43bf1dc	be1a274a-663c-45db-952c-bf75d8df53b6	ooo_submitted	New OOO Request	Alex Johnson submitted an OOO request	ooo_request	2dafd073-d009-46dc-a949-b95174b22590	t	2026-01-02 23:31:25.530089
748377e1-3c9d-4ddf-a23d-4c4c59364bd6	82defca1-4380-4327-a959-474de43bf1dc	be1a274a-663c-45db-952c-bf75d8df53b6	ooo_submitted	New OOO Request	Alex Johnson submitted an OOO request	ooo_request	c659aa80-746e-4332-ab41-7bf81e7d5e5b	t	2026-01-02 23:39:11.576894
09d109ad-14c5-4241-9670-6c23361c9897	82defca1-4380-4327-a959-474de43bf1dc	be1a274a-663c-45db-952c-bf75d8df53b6	evaluation_ic_submitted	Self-Assessment Submitted	Alex Johnson has submitted their self-assessment. Please review and complete the evaluation.	evaluation	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	t	2026-01-03 00:16:32.517193
42940407-99fd-4ca7-9b4b-ac5984305681	82defca1-4380-4327-a959-474de43bf1dc	\N	user_created	New Team Member	Malik Kabir has been added to your team	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	t	2026-01-03 13:59:48.244693
5b709eb2-17cf-41b8-b6f2-9c0c5e90f549	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	evaluation_completed	Evaluation Completed	Your performance evaluation for 2026-01-01 to 2026-03-31 has been completed by Michael Chen.	evaluation	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	f	2026-01-03 15:02:31.917631
d8780dbd-359b-453e-8fa7-7d8839e0d963	be1a274a-663c-45db-952c-bf75d8df53b6	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	318dd5df-d5e0-4da4-b43b-00a9f06bdaeb	f	2026-01-03 21:58:55.057575
9f4f4333-0b25-40eb-b36d-4e10624b7736	82defca1-4380-4327-a959-474de43bf1dc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	evaluation_ic_submitted	Self-Assessment Submitted	Malik Kabir has submitted their self-assessment. Please review and complete the evaluation.	evaluation	804c0257-6160-47a4-9e33-7f7fd272bb79	t	2026-01-03 14:44:50.490557
f2e16c1f-60e3-41ba-994b-10cccda84449	82defca1-4380-4327-a959-474de43bf1dc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_submitted	Overtime Request Submitted	Malik Kabir requested 12 overtime hours	overtime_request	b1c200ec-214a-4f01-b496-517e431682be	t	2026-01-03 15:27:34.675954
2d574b45-9dc9-4ed1-9356-91921d12c653	82defca1-4380-4327-a959-474de43bf1dc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_submitted	Overtime Request Submitted	Malik Kabir requested 13 overtime hours	overtime_request	28aa2d6c-930a-474e-a743-b69af401171b	t	2026-01-03 15:30:20.1689
b581644f-cfae-4f9a-8379-57134cd43d8b	82defca1-4380-4327-a959-474de43bf1dc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_submitted	Overtime Request Submitted	Malik Kabir requested 10 overtime hours	overtime_request	04162dc6-53c8-457a-a14a-5f1bb18af6cc	t	2026-01-03 15:47:05.379638
d1b67cd5-995e-4765-8d76-fa2f280cbb70	82defca1-4380-4327-a959-474de43bf1dc	be1a274a-663c-45db-952c-bf75d8df53b6	overtime_submitted	Overtime Request Submitted	Alex Johnson requested 10 overtime hours	overtime_request	318dd5df-d5e0-4da4-b43b-00a9f06bdaeb	t	2026-01-03 15:52:56.37252
8a27a393-0aa5-4625-8045-184ed2743ded	82defca1-4380-4327-a959-474de43bf1dc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	timesheet_submitted	Timesheet Submitted for Review	Malik Kabir submitted their timesheet for review	timesheet	e6352dc6-1a8c-4019-852f-ee3566c37595	f	2026-01-03 16:41:05.731867
f9c0c936-5637-4e35-98a5-26c2a033b116	6f3bbf1e-57c9-4914-88e6-390ce48668c1	be1a274a-663c-45db-952c-bf75d8df53b6	invoice_uploaded	Invoice Uploaded	Alex Johnson uploaded an invoice	invoice	3ef7aa5e-a483-4b0a-bdc2-99c73703c469	f	2026-01-03 17:08:01.160365
2d425280-9bc7-41d8-b22d-9b22d507acc6	726502da-d264-4140-a79d-9876ddf20410	be1a274a-663c-45db-952c-bf75d8df53b6	invoice_uploaded	Invoice Uploaded	Alex Johnson uploaded an invoice	invoice	3ef7aa5e-a483-4b0a-bdc2-99c73703c469	f	2026-01-03 17:08:01.167561
ebb1335f-e24c-44b7-9702-1cceb6490dfd	be1a274a-663c-45db-952c-bf75d8df53b6	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	2d0324d1-ef2f-465e-afdf-fa1afeba1c97	f	2026-01-03 21:58:47.340123
f9911596-3540-468b-8609-68ebc685f457	be1a274a-663c-45db-952c-bf75d8df53b6	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	2d0324d1-ef2f-465e-afdf-fa1afeba1c97	f	2026-01-03 21:58:51.158131
c06032f6-8ff6-4ab6-ab3a-a41baf7c5177	be1a274a-663c-45db-952c-bf75d8df53b6	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	318dd5df-d5e0-4da4-b43b-00a9f06bdaeb	f	2026-01-03 21:58:58.501074
149af62b-3c4c-49bb-aa50-63eb192e00e3	be1a274a-663c-45db-952c-bf75d8df53b6	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	318dd5df-d5e0-4da4-b43b-00a9f06bdaeb	f	2026-01-03 21:59:02.378449
ce1a64ee-f721-463c-a4a2-5342f1431e44	5886ba74-6aca-441a-8c03-a3d2fe5951a8	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	2a268962-f36b-4a8f-9b50-549bd5f6ae1c	f	2026-01-03 21:59:06.917538
b4681399-2b3d-4440-8ed1-784fbf951b88	5886ba74-6aca-441a-8c03-a3d2fe5951a8	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	0c6f0139-c0bd-4e54-8c68-2b7e6b4493aa	f	2026-01-03 21:59:15.452354
ff9c4f9a-32ce-4b6a-bf20-9d808a9ec532	5886ba74-6aca-441a-8c03-a3d2fe5951a8	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	0c6f0139-c0bd-4e54-8c68-2b7e6b4493aa	f	2026-01-03 21:59:20.753955
ec47ff59-3083-4e97-b0d8-8c83c4e2b1ba	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	user_created	New Team Member	Adeel Atta has been added to your team	user	52369260-d9da-4470-b769-09659ceacf39	f	2026-01-14 22:18:38.568915
030aecba-fe19-4e0d-bb0a-9c8e7c9288ff	test-supervisor-001	test-ic-user-001	overtime_submitted	Overtime Request Submitted	Test ICUser requested 10 overtime hours	overtime_request	9d2f140b-512d-4153-8af2-8428009c477d	t	2026-01-15 08:25:48.006791
af580749-8ee9-4521-8f60-b7b9c7cda285	test-ic-user-001	test-supervisor-001	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: rejected please. 	overtime_request	9d2f140b-512d-4153-8af2-8428009c477d	t	2026-01-15 08:29:16.688078
568151bf-a114-4ba0-bf58-8a537e4cabb5	test-supervisor-001	test-ic-user-001	overtime_submitted	Overtime Request Submitted	Test ICUser requested 9 overtime hours	overtime_request	d70be991-7627-4581-9ccd-1d7439bb34d8	t	2026-01-15 08:34:09.834361
f18e97e8-32dd-4242-a2a9-3a90cbb72a16	test-ic-user-001	test-supervisor-001	overtime_approved	Overtime Request Approved	Your overtime request was approved: 1 hours	overtime_request	25704dae-c1e5-4bc8-afdb-b654c8f95931	t	2026-01-15 08:35:16.469541
7521a6c1-2c6d-4a05-95a5-a983fb7da468	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	47b128c5-4f6d-4d22-8c99-6ab6fdbdc3dd	t	2026-01-15 12:57:28.086097
bc651282-58ae-4ce0-844c-1e256a163ec6	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	83769e70-41e2-457f-8573-ee0ce96937df	t	2026-01-15 13:03:54.982852
b246988d-a0b1-4ea5-b810-de26a7f31f55	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	24337aa5-3376-4828-ab39-557e6c8dcf8d	t	2026-01-15 13:12:59.66105
ca62fb4b-3b1f-48f1-821a-c3c5eaea59ae	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	cc02c639-8100-41e7-a24b-9051f5908f83	t	2026-01-15 13:45:28.559917
d6e99f87-8fde-460e-8b57-c1c4a0db530f	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	user_created	New Team Member	Imran Zahoor has been added to your team	user	de794e37-6ef0-4e4c-b121-904de280aa38	f	2026-01-16 09:05:51.485937
fe77d925-6a45-40e1-a924-e8e576fe038c	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	user_created	New Team Member	Malik Demo has been added to your team	user	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	f	2026-01-16 09:10:57.204307
d79da372-d85f-422a-9902-4bbe00acf4cc	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	overtime_submitted	Overtime Request Submitted	Malik Demo requested 9 overtime hours	overtime_request	d63a8cd2-610a-4bfa-b4bc-f043ea1208f6	f	2026-01-16 09:21:05.422338
fe6ef600-bfd6-498a-816c-bb49b13a1cef	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	invoice_uploaded	Invoice Submitted for Review	Malik Demo submitted an invoice for approval	invoice	fec44490-9f1c-4702-a7ed-09e9c63ba751	f	2026-01-16 09:23:25.384803
d7102d78-08bd-4633-b24e-4931e75576c9	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	evaluation_created	New Performance Evaluation	A new performance evaluation has been created for you. Please complete your self-assessment.	evaluation	804c0257-6160-47a4-9e33-7f7fd272bb79	t	2026-01-03 14:39:10.639399
86859626-2a52-4eba-bb77-ed77c62d0af4	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	evaluation_completed	Evaluation Finalized	Your performance evaluation has been completed by Michael Chen.	evaluation	804c0257-6160-47a4-9e33-7f7fd272bb79	t	2026-01-03 14:47:18.039314
917133af-d71a-4d81-ab09-423e3e192dab	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: i dont accept it. 	overtime_request	46c0a88f-507b-4b79-b23e-cc353b7dcd81	t	2026-01-03 15:08:12.867023
b9cea308-a1a3-445b-94e2-dc85b4c689d2	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: no no!	overtime_request	b1c200ec-214a-4f01-b496-517e431682be	t	2026-01-03 15:28:49.405665
f6341d34-5725-4e14-9dae-7d81bba9909a	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	overtime_approved	Overtime Request Approved	Your overtime request was approved: 13 hours	overtime_request	28aa2d6c-930a-474e-a743-b69af401171b	t	2026-01-03 15:54:49.566113
cf57d2df-0523-4a38-859a-f79b6aeb35d8	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_rejected	OOO Request Rejected	Your OOO request was rejected: becos	ooo_request	441fb6df-ca4b-46cc-b8d1-24dcf507145f	f	2026-01-17 10:12:36.085468
5c7928a1-f1b4-46b8-9bfb-bbfb6f370974	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	timesheet_rejected	Timesheet Rejected	Your timesheet was rejected: reject	timesheet	433c15f3-3032-414e-be6b-5f46da190c39	f	2026-01-18 21:48:13.499856
54a18631-2204-4a6d-9229-dbe5f1ebb2af	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_rejected	Weekend Work Rejected	Your weekend work request was rejected: R	overtime_request	1df81b53-4585-4653-8b7e-b5b6ce062613	f	2026-01-18 21:48:26.231089
428d6070-ea05-45cc-aaa4-5d7ad8700f53	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_approved	Overtime Request Approved	Your overtime request was approved: 9 hours	overtime_request	d63a8cd2-610a-4bfa-b4bc-f043ea1208f6	f	2026-01-18 21:48:30.764577
af8f231e-d229-44db-af59-01e734094839	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_approved	Overtime Request Approved	Your overtime request was approved: 9 hours	overtime_request	0f086654-9568-4dcd-afd3-cc787943252c	f	2026-01-18 21:48:34.345984
fbb07a1d-18b6-49dc-98ce-ed02d777d5f9	test-ic-user-001	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_approved	Overtime Request Approved	Your overtime request was approved: 9 hours	overtime_request	d70be991-7627-4581-9ccd-1d7439bb34d8	f	2026-01-18 21:48:39.396269
8f4fcd60-5145-4f85-bdc2-d28f7cfc17af	test-ic-user-001	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: R	overtime_request	aecbf750-8ee1-46db-b2bc-d07558a0b0e5	f	2026-01-18 21:48:48.570627
2124baf9-bf19-47b0-9733-8821c17eed7b	test-ic-user-001	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_rejected	Weekend Work Rejected	Your weekend work request was rejected: R	overtime_request	c1542201-85dd-4846-895b-0b9181820663	f	2026-01-18 21:48:53.792763
00193003-7ba1-49d7-87b6-09915c5e7b8f	test-ic-user-001	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_rejected	Weekend Work Rejected	Your weekend work request was rejected: R	overtime_request	5fba0bd7-9c28-4440-847c-a11215a6b656	f	2026-01-18 21:48:58.174826
5faf217a-5c54-4433-9dc8-0e26c8a8567f	test-ic-user-001	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: R	overtime_request	cc768a2a-7dfd-4629-95f4-b3eb775bd14c	f	2026-01-18 21:49:03.034964
ebd5fb22-b027-44bc-ab23-f1131bf4b700	test-ic-user-001	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_rejected	Weekend Work Rejected	Your weekend work request was rejected: R	overtime_request	96d37225-bd52-4ccb-8e06-a7039b201017	f	2026-01-18 21:49:08.708821
ee90c714-a004-436f-b869-96537bbdd9a9	74e619cf-48e9-44b5-a7f9-93f813d7bedf	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	e7951620-aa83-4b9a-a75c-44a4f437d819	t	2026-01-19 10:09:04.815678
146c89e0-fc69-4eef-a313-8a933cb9d30a	a23598e5-97e2-4a34-a052-6aa30e11d92b	74e619cf-48e9-44b5-a7f9-93f813d7bedf	invoice_uploaded	Invoice Submitted for Review	Adeel Atta submitted an invoice for approval	invoice	a91d15e5-c760-4c4c-a398-be88ce43adfd	f	2026-01-30 11:30:11.750297
816b5058-c864-4eb9-93b9-c066167a5d20	a23598e5-97e2-4a34-a052-6aa30e11d92b	de794e37-6ef0-4e4c-b121-904de280aa38	invoice_uploaded	Invoice Submitted for Review	Imran Zahoor submitted an invoice for approval	invoice	65dce3b2-a439-4ac5-b4da-cb3c155ba1b6	f	2026-02-01 15:35:49.315872
466d8b4b-b077-47af-b4d8-824867879dc7	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	invoice_rejected	Invoice Rejected	Your invoice UPLOAD-1768555401348 was rejected: demo	invoice	fec44490-9f1c-4702-a7ed-09e9c63ba751	f	2026-02-02 08:01:24.988681
8f77b29d-9b89-4350-b77f-74c7b1b7c6f2	be1a274a-663c-45db-952c-bf75d8df53b6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	invoice_rejected	Invoice Rejected	Your invoice INV-2026-002 was rejected: demo	invoice	3ef7aa5e-a483-4b0a-bdc2-99c73703c469	f	2026-02-02 08:01:33.369087
9b5ce597-fd3b-43b9-89b8-91139f4e4a84	be1a274a-663c-45db-952c-bf75d8df53b6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	invoice_rejected	Invoice Rejected	Your invoice INV-2026-001 was rejected: demo	invoice	4fb1d253-9883-44ca-b917-8afe97d29e6d	f	2026-02-02 08:01:39.139845
6a216058-3cf7-4d83-81a0-c5033bbcacdb	a23598e5-97e2-4a34-a052-6aa30e11d92b	05cb123d-2241-4695-88cd-e2969d2a22ef	invoice_uploaded	Invoice Submitted for Review	Salem Daniel submitted an invoice for approval	invoice	c854ca4c-dc7a-4d90-86c3-867abca8771c	f	2026-02-02 09:35:34.638568
033f2949-27aa-4580-abf4-bec8160b0084	74e619cf-48e9-44b5-a7f9-93f813d7bedf	a23598e5-97e2-4a34-a052-6aa30e11d92b	timesheet_approved	Timesheet Approved	Your timesheet has been approved by Pandu Raharja-Liu	timesheet	e106b2f1-08c5-4eb3-8a19-c98900256f66	f	2026-02-03 15:23:07.294684
5e4ecd4b-bd1a-4296-8aeb-8d084af121cd	05cb123d-2241-4695-88cd-e2969d2a22ef	a23598e5-97e2-4a34-a052-6aa30e11d92b	timesheet_approved	Timesheet Approved	Your timesheet has been approved by Pandu Raharja-Liu	timesheet	e3cf3eba-aac9-4b94-b37e-026d990964e7	f	2026-02-03 15:23:25.77162
0a32e4e1-8202-4acf-9b98-cebed8594ea6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	invoice_uploaded	Invoice Submitted for Review	Malik Demo submitted an invoice for approval	invoice	fec44490-9f1c-4702-a7ed-09e9c63ba751	t	2026-01-16 09:23:25.293639
c2d66028-2800-4617-a107-093377aa4412	de794e37-6ef0-4e4c-b121-904de280aa38	a23598e5-97e2-4a34-a052-6aa30e11d92b	timesheet_approved	Timesheet Approved	Your timesheet has been approved by Pandu Raharja-Liu	timesheet	99b176c8-85a5-4082-b2a1-6b4694493b6c	t	2026-02-03 15:23:29.842103
82be9459-d206-4bef-bc96-d131db47e265	05cb123d-2241-4695-88cd-e2969d2a22ef	d264c297-6dd7-42c7-ad80-1c4eda70cac2	invoice_approved	Invoice Approved	Your invoice UPLOAD-1770024920492 has been approved and synced to our records	invoice	c854ca4c-dc7a-4d90-86c3-867abca8771c	f	2026-02-03 15:56:22.258547
1f27119b-86ac-46a9-a82b-de29c0c032b2	74e619cf-48e9-44b5-a7f9-93f813d7bedf	d264c297-6dd7-42c7-ad80-1c4eda70cac2	invoice_approved	Invoice Approved	Your invoice INV-2026-001 has been approved and synced to our records	invoice	a91d15e5-c760-4c4c-a398-be88ce43adfd	f	2026-02-03 15:58:20.287058
980366ca-871c-453a-abd5-c9c11f900a6e	82defca1-4380-4327-a959-474de43bf1dc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_submitted	Overtime Request Submitted	Malik Kabir requested 9 overtime hours	overtime_request	aad7c5d2-8488-4aee-a871-b5f66fc0ad9d	f	2026-02-04 11:28:42.018915
7c654b7f-f821-4391-859c-dcbf20041174	82defca1-4380-4327-a959-474de43bf1dc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_submitted	Overtime Request Submitted	Malik Kabir requested 2 overtime hours	overtime_request	4b8cb1e0-3378-49ad-b5f8-4c8b84ef9cc5	f	2026-02-04 11:29:07.307704
14278af2-873b-4a64-91e5-aecdea25e201	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	timesheet_approved	Timesheet Approved	Your timesheet has been approved by Michael Chen	timesheet	e6352dc6-1a8c-4019-852f-ee3566c37595	t	2026-01-03 16:44:24.573398
3a5b3cb8-b54b-4f22-8643-45399f782729	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	04162dc6-53c8-457a-a14a-5f1bb18af6cc	t	2026-01-03 21:58:40.333711
9aedc3e1-ba5c-4866-855d-8dafd2ca61d2	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	d1b9a830-eafa-4601-8634-f143b0079d66	t	2026-01-03 21:59:11.038383
6c586b5e-c5ee-43b2-83db-70f645faeb97	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	invoice_uploaded	Invoice Uploaded	Pandu Raharja-Liu uploaded an invoice	invoice	315a1bc8-a768-485a-9605-62fb32b6f389	t	2026-01-03 22:00:19.482199
000cef0d-5f47-415f-af40-c408057c52a3	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	invoice_uploaded	Invoice Uploaded	Pandu Raharja-Liu uploaded an invoice	invoice	5e20211c-6223-4d7e-948f-178531204a83	t	2026-01-03 22:11:07.8132
abd789f3-7c9a-40e7-8d8b-0ace8f0fa63d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	invoice_uploaded	Invoice Uploaded	Pandu Raharja-Liu uploaded an invoice	invoice	f29751ee-2eba-4205-bc0e-0b34a9a20245	t	2026-01-03 22:12:34.800035
9e2db697-dbf5-43e9-b27a-b61df4497c38	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	invoice_uploaded	Invoice Uploaded	Pandu Raharja-Liu uploaded an invoice	invoice	f27f8c4b-7fa6-40ef-bcf5-df32325232fb	t	2026-01-03 22:39:36.53109
e9c614ef-defe-47d6-83f5-9c5634084d2c	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	invoice_uploaded	Invoice Uploaded	Pandu Raharja-Liu uploaded an invoice	invoice	8e86651f-97c0-43b4-a721-73af038ae9f3	t	2026-01-03 22:47:17.105261
7054ec48-ef6b-42ed-b4b7-5fac164e3ead	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	invoice_uploaded	Invoice Uploaded	Pandu Raharja-Liu uploaded an invoice	invoice	0071144a-4899-4ab5-94f4-afd58699604e	t	2026-01-03 22:50:23.079116
7713e016-2baa-42b3-abfc-ada98e976647	d264c297-6dd7-42c7-ad80-1c4eda70cac2	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	ooo_submitted	New OOO Request	Malik Supervisor submitted an OOO request	ooo_request	47b128c5-4f6d-4d22-8c99-6ab6fdbdc3dd	t	2026-01-15 12:55:44.269922
c7e10e2c-3b40-44bf-ba87-b8b16c932c49	d264c297-6dd7-42c7-ad80-1c4eda70cac2	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	ooo_submitted	New OOO Request	Malik Supervisor submitted an OOO request	ooo_request	83769e70-41e2-457f-8573-ee0ce96937df	t	2026-01-15 13:02:58.684621
ef237ae8-0496-4bb2-8947-8821dfabefb5	d264c297-6dd7-42c7-ad80-1c4eda70cac2	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	ooo_submitted	New OOO Request	Malik Supervisor submitted an OOO request	ooo_request	24337aa5-3376-4828-ab39-557e6c8dcf8d	t	2026-01-15 13:12:39.600942
a6b5350e-ec23-42e3-a10b-2bb28c4211c4	d264c297-6dd7-42c7-ad80-1c4eda70cac2	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	ooo_submitted	New OOO Request	Malik Supervisor submitted an OOO request	ooo_request	cc02c639-8100-41e7-a24b-9051f5908f83	t	2026-01-15 13:44:08.458198
0a023c10-29d8-439d-8fc5-646a7c3c2d10	d264c297-6dd7-42c7-ad80-1c4eda70cac2	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	ooo_submitted	New OOO Request	Malik Demo submitted an OOO request	ooo_request	441fb6df-ca4b-46cc-b8d1-24dcf507145f	t	2026-01-16 09:19:15.161102
7debe86f-3f65-4cc6-80d6-486080acabef	d264c297-6dd7-42c7-ad80-1c4eda70cac2	74e619cf-48e9-44b5-a7f9-93f813d7bedf	ooo_submitted	New OOO Request	Adeel Atta submitted an OOO request	ooo_request	e7951620-aa83-4b9a-a75c-44a4f437d819	t	2026-01-19 09:56:08.017424
9dbcb4f0-cd42-4ead-aed9-d4f7d1d62c6e	d264c297-6dd7-42c7-ad80-1c4eda70cac2	74e619cf-48e9-44b5-a7f9-93f813d7bedf	invoice_uploaded	Invoice Submitted for Review	Adeel Atta submitted an invoice for approval	invoice	a91d15e5-c760-4c4c-a398-be88ce43adfd	t	2026-01-30 11:30:11.611708
0929e04c-a478-4f8b-b16e-3094bc1c26a3	d264c297-6dd7-42c7-ad80-1c4eda70cac2	de794e37-6ef0-4e4c-b121-904de280aa38	invoice_uploaded	Invoice Submitted for Review	Imran Zahoor submitted an invoice for approval	invoice	65dce3b2-a439-4ac5-b4da-cb3c155ba1b6	t	2026-02-01 15:35:49.225276
aaa06017-6a87-4994-ae73-5428b7be7cb3	d264c297-6dd7-42c7-ad80-1c4eda70cac2	a23598e5-97e2-4a34-a052-6aa30e11d92b	timesheet_approved	Team Timesheet Approved	Imran Zahoor's timesheet was approved by Pandu Raharja-Liu	timesheet	99b176c8-85a5-4082-b2a1-6b4694493b6c	t	2026-02-03 15:23:30.023232
610ac6a5-546b-43db-959e-7b2371ad2804	d264c297-6dd7-42c7-ad80-1c4eda70cac2	\N	user_created	New Team Member	Malik K. Contractor has been added to your team	user	63552eff-f6aa-473e-92bc-957991d3505d	t	2026-02-04 11:50:08.229412
bea4e381-0e0d-4ce3-b0ec-20aea3c5deb4	de794e37-6ef0-4e4c-b121-904de280aa38	d264c297-6dd7-42c7-ad80-1c4eda70cac2	invoice_approved	Invoice Approved	Your invoice UPLOAD-1769960147596 has been approved and synced to our records	invoice	65dce3b2-a439-4ac5-b4da-cb3c155ba1b6	t	2026-02-03 15:56:26.471015
5177e18a-9267-4f25-8cb9-469c06cedba8	d264c297-6dd7-42c7-ad80-1c4eda70cac2	05cb123d-2241-4695-88cd-e2969d2a22ef	invoice_uploaded	Invoice Submitted for Review	Salem Daniel submitted an invoice for approval	invoice	c854ca4c-dc7a-4d90-86c3-867abca8771c	t	2026-02-02 09:35:34.54809
bc6e2d6d-847a-442b-bfba-45aa45fab405	d264c297-6dd7-42c7-ad80-1c4eda70cac2	a23598e5-97e2-4a34-a052-6aa30e11d92b	timesheet_approved	Team Timesheet Approved	Adeel Atta's timesheet was approved by Pandu Raharja-Liu	timesheet	e106b2f1-08c5-4eb3-8a19-c98900256f66	t	2026-02-03 15:23:07.476183
b97a08e4-1c16-441b-a93b-cbfc87b02e94	d264c297-6dd7-42c7-ad80-1c4eda70cac2	a23598e5-97e2-4a34-a052-6aa30e11d92b	timesheet_approved	Team Timesheet Approved	Salem Daniel's timesheet was approved by Pandu Raharja-Liu	timesheet	e3cf3eba-aac9-4b94-b37e-026d990964e7	t	2026-02-03 15:23:25.955713
37d7ec18-ca91-4378-8dd7-81916f4ef38f	d264c297-6dd7-42c7-ad80-1c4eda70cac2	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_submitted	New OOO Request	Malik Kabir submitted an OOO request	ooo_request	434aa26f-2956-4791-8385-462a4c679c0c	t	2026-02-04 11:27:46.856325
3bb60c4b-6014-43b1-aa87-3c3620503ceb	d264c297-6dd7-42c7-ad80-1c4eda70cac2	63552eff-f6aa-473e-92bc-957991d3505d	ooo_submitted	New OOO Request	Malik K. Contractor submitted an OOO request	ooo_request	44cc6f95-f332-460b-a090-275a0239027f	t	2026-02-04 11:51:19.199945
a5a7dd2d-86e2-4fd2-8743-a9aaa126c4e3	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	44cc6f95-f332-460b-a090-275a0239027f	f	2026-02-04 11:52:23.229477
78eb8c2a-1d1e-4e85-832f-949ee74da571	d264c297-6dd7-42c7-ad80-1c4eda70cac2	63552eff-f6aa-473e-92bc-957991d3505d	ooo_submitted	New OOO Request	Malik K. Contractor submitted an OOO request	ooo_request	44366729-c03a-45e9-9cc6-372fadc267b2	f	2026-02-04 11:56:55.216131
9b7b6586-fbce-4336-98d7-56ce1281853d	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	44366729-c03a-45e9-9cc6-372fadc267b2	f	2026-02-04 11:57:39.207735
674ff908-e029-415c-85cb-fbbab510ad2f	d264c297-6dd7-42c7-ad80-1c4eda70cac2	63552eff-f6aa-473e-92bc-957991d3505d	overtime_submitted	Overtime Request Submitted	Malik K. Contractor requested 9 overtime hours	overtime_request	9f58ff56-2f63-4d02-ba0a-949dc77ad963	f	2026-02-04 11:59:12.14408
cf738d5b-d4fd-4b80-b8db-8dc62d47ea41	d264c297-6dd7-42c7-ad80-1c4eda70cac2	63552eff-f6aa-473e-92bc-957991d3505d	evaluation_created	Self-Evaluation Started	Malik K. Contractor has started a self-evaluation and will submit it for your review.	evaluation	756b83de-ddae-4911-bc88-e100587928a6	f	2026-02-04 12:02:49.358286
2239074e-2e95-4d3d-a84f-49ca17f5397a	d264c297-6dd7-42c7-ad80-1c4eda70cac2	63552eff-f6aa-473e-92bc-957991d3505d	evaluation_ic_submitted	Self-Assessment Submitted	Malik K. Contractor has submitted their self-assessment. Please review and complete the evaluation.	evaluation	756b83de-ddae-4911-bc88-e100587928a6	f	2026-02-04 12:04:09.44171
ad73b7b9-294c-4428-adfb-a772805b7f1a	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	evaluation_completed	Evaluation Completed	Your performance evaluation for 2026-02-01 to 2026-02-28 has been completed by Malik Kabir.	evaluation	756b83de-ddae-4911-bc88-e100587928a6	f	2026-02-04 12:05:14.722774
884fe5aa-ee73-4a77-b0bf-618d6d20e221	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	evaluation_created	New Performance Evaluation	A new performance evaluation has been created for you. Please complete your self-assessment.	evaluation	6650ddbc-ac4e-487d-895c-0fea1089b306	f	2026-02-04 12:26:19.301621
55b65583-c0ae-4c37-8c69-a922d59cb4f2	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_approved	Overtime Request Approved	Your overtime request was approved: 9 hours	overtime_request	9f58ff56-2f63-4d02-ba0a-949dc77ad963	f	2026-02-04 12:26:52.77267
da6e7231-287c-4a7c-a107-84b842b9f0a6	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_approved	Overtime Request Approved	Your overtime request was approved: 8 hours	overtime_request	14835783-5609-4052-8fb0-dbcd1dcbabbe	f	2026-02-04 12:27:05.265965
b10c1dd1-b3c8-488c-99f6-5117d5747c07	d264c297-6dd7-42c7-ad80-1c4eda70cac2	63552eff-f6aa-473e-92bc-957991d3505d	ooo_submitted	New OOO Request	Malik K. Contractor submitted an OOO request	ooo_request	4bb4fe99-63e8-41bc-981c-51682a9f8168	f	2026-02-04 12:37:10.666425
41fa3cc3-5279-4c61-a863-fb249a948188	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	4bb4fe99-63e8-41bc-981c-51682a9f8168	f	2026-02-04 12:38:27.727045
97977082-2a7a-407e-9d84-6f9c8da50c12	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2998c744-43bb-4633-86a1-80d576c52931	invoice_uploaded	Invoice Submitted for Review	Emmanuel Agba submitted an invoice for approval	invoice	f5d38278-c7b7-48d5-8686-ad57ee6b804d	f	2026-02-05 09:09:32.187477
2449267a-140f-454a-b7f3-0586b443af7d	a23598e5-97e2-4a34-a052-6aa30e11d92b	2998c744-43bb-4633-86a1-80d576c52931	invoice_uploaded	Invoice Submitted for Review	Emmanuel Agba submitted an invoice for approval	invoice	f5d38278-c7b7-48d5-8686-ad57ee6b804d	f	2026-02-05 09:09:32.278505
bc929ef3-83b6-4f38-a8fb-41328a5d434e	2998c744-43bb-4633-86a1-80d576c52931	d264c297-6dd7-42c7-ad80-1c4eda70cac2	timesheet_approved	Timesheet Approved	Your timesheet has been approved by Malik Kabir	timesheet	466401e1-e47a-474d-8d7d-937db22d39f8	f	2026-02-10 13:00:31.012907
18f6a408-4913-4a74-83b7-c9710346cb64	a23598e5-97e2-4a34-a052-6aa30e11d92b	d264c297-6dd7-42c7-ad80-1c4eda70cac2	timesheet_approved	Team Timesheet Approved	Emmanuel Agba's timesheet was approved by Malik Kabir	timesheet	466401e1-e47a-474d-8d7d-937db22d39f8	f	2026-02-10 13:00:31.139462
b759bc2d-bd25-484b-9824-babede35787c	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	user_created	New Team Member	Yuliya M has been added to your team	user	ed456247-0fe5-47d9-87c1-c2af4e1a4139	f	2026-02-11 13:37:00.272854
3055882e-3d9b-40b3-bc2d-a7b3dc2b5806	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	user_created	New Team Member	Galyna Korol has been added to your team	user	38cc3c9a-a1da-4aab-9408-75d1f5f4bcb8	f	2026-02-11 15:18:28.093526
46417544-2863-4724-9dc2-5aa953065492	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	user_created	New Team Member	Rejoice Obosi has been added to your team	user	1d9304c8-2b7e-4cc1-b1b4-0c6142e4ba66	f	2026-02-11 15:19:54.813757
\.


--
-- Data for Name: ooo_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ooo_requests (id, user_id, manager_id, start_date, end_date, ooo_type, reason, status, reviewed_by, reviewed_at, review_note) FROM stdin;
2dafd073-d009-46dc-a949-b95174b22590	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	2026-01-21	2026-01-21	full_day	Cross-account test workflow	approved	82defca1-4380-4327-a959-474de43bf1dc	2026-01-02 23:32:29.079	Approved for vacation
c659aa80-746e-4332-ab41-7bf81e7d5e5b	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	2026-02-10	2026-02-12	full_day	Testing rejection workflow	rejected	82defca1-4380-4327-a959-474de43bf1dc	2026-01-02 23:39:54.612	Request conflicts with project deadline
47b128c5-4f6d-4d22-8c99-6ab6fdbdc3dd	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-19	2026-01-22	full_day	good time	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 12:57:28.072	good
83769e70-41e2-457f-8573-ee0ce96937df	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-20	2026-01-23	full_day	yep, again!	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 13:03:54.969	okay good.
24337aa5-3376-4828-ab39-557e6c8dcf8d	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-28	2026-01-29	full_day		approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 13:12:59.633	aesome
cc02c639-8100-41e7-a24b-9051f5908f83	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-22	2026-01-23	full_day		approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 13:45:28.534	good boy
441fb6df-ca4b-46cc-b8d1-24dcf507145f	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-19	2026-01-21	full_day		rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-17 10:12:35.831	becos
e7951620-aa83-4b9a-a75c-44a4f437d819	74e619cf-48e9-44b5-a7f9-93f813d7bedf	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-16	2026-01-16	half_day	Due to Emergency work related to Family.	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-19 10:09:04.605	\N
434aa26f-2956-4791-8385-462a4c679c0c	d264c297-6dd7-42c7-ad80-1c4eda70cac2	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-11	2026-02-12	full_day		pending	\N	\N	\N
44cc6f95-f332-460b-a090-275a0239027f	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-10	2026-02-12	full_day	sick	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-04 11:52:22.976	\N
44366729-c03a-45e9-9cc6-372fadc267b2	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-05	2026-02-06	full_day	very sick	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-04 11:57:39.009	gws
4bb4fe99-63e8-41bc-981c-51682a9f8168	63552eff-f6aa-473e-92bc-957991d3505d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-23	2026-02-25	half_day		approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-04 12:38:27.523	\N
\.


--
-- Data for Name: overtime_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.overtime_requests (id, user_id, timesheet_id, date, requested_hours, approved_hours, status, reviewed_by, reviewed_at, review_note, created_at, is_weekend_work) FROM stdin;
3b04974c-41f8-4bc6-adf5-62b854bce5e8	be1a274a-663c-45db-952c-bf75d8df53b6	d05a5431-517f-4b32-b91b-6a02f2888c7b	2026-04-15	10	10	approved	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 00:06:37.825	\N	2026-01-03 00:05:57.787351	f
46c0a88f-507b-4b79-b23e-cc353b7dcd81	d264c297-6dd7-42c7-ad80-1c4eda70cac2	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-07	10	\N	rejected	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:08:12.849	i dont accept it. 	2026-01-03 15:02:35.26159	f
b1c200ec-214a-4f01-b496-517e431682be	d264c297-6dd7-42c7-ad80-1c4eda70cac2	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-08	12	\N	rejected	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:28:49.38	no no!	2026-01-03 15:27:34.660247	f
28aa2d6c-930a-474e-a743-b69af401171b	d264c297-6dd7-42c7-ad80-1c4eda70cac2	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-09	13	13	approved	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 15:54:49.538	\N	2026-01-03 15:30:20.160088	f
04162dc6-53c8-457a-a14a-5f1bb18af6cc	d264c297-6dd7-42c7-ad80-1c4eda70cac2	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-10	10	\N	rejected	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 21:58:40.264	didn't work that much	2026-01-03 15:47:05.362822	f
2d0324d1-ef2f-465e-afdf-fa1afeba1c97	be1a274a-663c-45db-952c-bf75d8df53b6	4d3c9749-2a9e-4427-8f63-2cc80b818d16	2026-02-05	10	\N	rejected	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 21:58:51.144	didn't work that much	2026-01-03 15:52:56.189196	f
318dd5df-d5e0-4da4-b43b-00a9f06bdaeb	be1a274a-663c-45db-952c-bf75d8df53b6	4d3c9749-2a9e-4427-8f63-2cc80b818d16	2026-02-05	10	\N	rejected	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 21:59:02.372	didn't work that much	2026-01-03 15:52:56.342048	f
2a268962-f36b-4a8f-9b50-549bd5f6ae1c	5886ba74-6aca-441a-8c03-a3d2fe5951a8	853e4b49-dfd9-4e97-93c0-bbfc1181ada2	2026-03-10	9	\N	rejected	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 21:59:06.901	didn't work that much	2026-01-03 15:56:39.765386	f
d1b9a830-eafa-4601-8634-f143b0079d66	d264c297-6dd7-42c7-ad80-1c4eda70cac2	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-10	10	\N	rejected	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 21:59:11.03	didn't work that much	2026-01-03 15:47:05.216676	f
0c6f0139-c0bd-4e54-8c68-2b7e6b4493aa	5886ba74-6aca-441a-8c03-a3d2fe5951a8	ffc8c325-3fd0-4518-b153-906d77a3b7f8	2026-04-15	11	\N	rejected	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-03 21:59:20.743	didn't work that much	2026-01-03 15:59:56.011398	f
9d2f140b-512d-4153-8af2-8428009c477d	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-07	10	\N	rejected	test-supervisor-001	2026-01-15 08:29:16.643	rejected please. 	2026-01-15 08:25:47.99403	f
25704dae-c1e5-4bc8-afdb-b654c8f95931	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-03	1	1	approved	test-supervisor-001	2026-01-15 08:35:16.44	\N	2026-01-15 08:10:20.782519	t
1df81b53-4585-4653-8b7e-b5b6ce062613	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	433c15f3-3032-414e-be6b-5f46da190c39	2026-01-03	3	\N	rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:48:25.983	R	2026-01-16 09:21:39.900039	t
d63a8cd2-610a-4bfa-b4bc-f043ea1208f6	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	433c15f3-3032-414e-be6b-5f46da190c39	2026-01-02	9	9	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:48:30.576	\N	2026-01-16 09:21:05.232881	f
0f086654-9568-4dcd-afd3-cc787943252c	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	433c15f3-3032-414e-be6b-5f46da190c39	2026-01-02	9	9	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:48:34.159	\N	2026-01-16 09:21:04.407399	f
d70be991-7627-4581-9ccd-1d7439bb34d8	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-12	9	9	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:48:39.209	\N	2026-01-15 08:34:09.827156	f
aecbf750-8ee1-46db-b2bc-d07558a0b0e5	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-12	9	\N	rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:48:48.214	R	2026-01-15 08:34:09.468458	f
c1542201-85dd-4846-895b-0b9181820663	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-11	7	\N	rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:48:53.562	R	2026-01-15 08:33:58.396959	t
5fba0bd7-9c28-4440-847c-a11215a6b656	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-10	3	\N	rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:48:57.936	R	2026-01-15 08:31:28.673059	t
cc768a2a-7dfd-4629-95f4-b3eb775bd14c	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-07	10	\N	rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:49:02.806	R	2026-01-15 08:25:47.633054	f
96d37225-bd52-4ccb-8e06-a7039b201017	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-17	4	\N	rejected	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:49:08.479	R	2026-01-15 08:10:20.795294	t
2f374cf3-60d4-4296-9630-391a22a82657	d264c297-6dd7-42c7-ad80-1c4eda70cac2	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-04	9	\N	pending	\N	\N	\N	2026-02-04 11:28:41.257303	f
aad7c5d2-8488-4aee-a871-b5f66fc0ad9d	d264c297-6dd7-42c7-ad80-1c4eda70cac2	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-04	9	\N	pending	\N	\N	\N	2026-02-04 11:28:41.704298	f
e99c7ffe-953c-4ec6-aa45-888c559ff4f1	d264c297-6dd7-42c7-ad80-1c4eda70cac2	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-07	2	\N	pending	\N	\N	\N	2026-02-04 11:29:06.715748	t
4b8cb1e0-3378-49ad-b5f8-4c8b84ef9cc5	d264c297-6dd7-42c7-ad80-1c4eda70cac2	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-07	2	\N	pending	\N	\N	\N	2026-02-04 11:29:07.119495	f
9f58ff56-2f63-4d02-ba0a-949dc77ad963	63552eff-f6aa-473e-92bc-957991d3505d	fe5796bc-2330-4b22-99be-f6636af6f932	2026-02-16	9	9	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-04 12:26:52.567	\N	2026-02-04 11:59:11.955863	f
14835783-5609-4052-8fb0-dbcd1dcbabbe	63552eff-f6aa-473e-92bc-957991d3505d	fe5796bc-2330-4b22-99be-f6636af6f932	2026-02-16	9	8	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-04 12:27:05.062	\N	2026-02-04 11:59:11.245766	f
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (token, user_id, username, created_at, expires_at) FROM stdin;
f2a6c9e4698ab82c2772d276776be2e98e8d9e78c7edb7915250d6147d7b1227	de794e37-6ef0-4e4c-b121-904de280aa38	Imran	2026-02-20 12:09:55.583	2026-02-21 12:09:55.583
73615421eae0e56c697e966d8665c69db028cc22230fd9d9b1cda2e810f1b87e	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Malik	2026-02-23 08:01:59.949	2026-02-24 08:01:59.949
\.


--
-- Data for Name: timesheets; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.timesheets (id, user_id, month, year, total_hours, status, submitted_at, reviewed_by, reviewed_at, review_note) FROM stdin;
e6352dc6-1a8c-4019-852f-ee3566c37595	d264c297-6dd7-42c7-ad80-1c4eda70cac2	1	2026	23	approved	2026-01-03 16:41:05.703	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 16:44:24.482	good
765a4094-c53e-4555-a671-069289f47f4f	74e619cf-48e9-44b5-a7f9-93f813d7bedf	2	2026	6	draft	\N	\N	\N	\N
433c15f3-3032-414e-be6b-5f46da190c39	73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	1	2026	20	rejected	2026-01-16 09:23:25.005	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-18 21:48:13.341	reject
2604ef17-c311-4805-94ba-7de56c7d7848	test-ic-user-001	1	2026	46	draft	\N	\N	\N	\N
e106b2f1-08c5-4eb3-8a19-c98900256f66	74e619cf-48e9-44b5-a7f9-93f813d7bedf	1	2026	83	approved	2026-01-30 11:30:11.315	a23598e5-97e2-4a34-a052-6aa30e11d92b	2026-02-03 15:23:07.136	\N
e3cf3eba-aac9-4b94-b37e-026d990964e7	05cb123d-2241-4695-88cd-e2969d2a22ef	1	2026	160	approved	2026-02-02 09:35:34.261	a23598e5-97e2-4a34-a052-6aa30e11d92b	2026-02-03 15:23:25.564	\N
99b176c8-85a5-4082-b2a1-6b4694493b6c	de794e37-6ef0-4e4c-b121-904de280aa38	1	2026	160	approved	2026-02-01 15:35:48.935	a23598e5-97e2-4a34-a052-6aa30e11d92b	2026-02-03 15:23:29.692	\N
158803b3-ef9b-4428-a700-4a601f80a02f	de794e37-6ef0-4e4c-b121-904de280aa38	2	2026	112	draft	\N	\N	\N	\N
9825f063-6d1c-4749-95db-c7f7a86b570f	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2	2026	23	draft	\N	\N	\N	\N
fe5796bc-2330-4b22-99be-f6636af6f932	63552eff-f6aa-473e-92bc-957991d3505d	2	2026	14	draft	\N	\N	\N	\N
466401e1-e47a-474d-8d7d-937db22d39f8	2998c744-43bb-4633-86a1-80d576c52931	1	2026	168	approved	2026-02-05 09:09:31.831	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-10 13:00:30.863	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, first_name, last_name, role, job_title, team, supervisor_id, manager_id, is_active, avatar_url, experience_level, contractor_status, hourly_rate, monthly_cap, contractor_category, must_change_password, completed_onboarding) FROM stdin;
bfad93d3-95ed-4a97-b87e-f45872d0cbb6	malik_supervisor	$2b$12$6P1Kw1C66Uvg/AxtTZNWhe0Bp11eX/prYrg.Ain0v3fXauit7ipZq	techmaleek@gmail.com	Malik	Supervisor	ic	Operations Supervisor		d264c297-6dd7-42c7-ad80-1c4eda70cac2	\N	t	\N	1	engaged	\N	\N	\N	f	{"ooo": true, "portal": true, "timesheets": true}
63552eff-f6aa-473e-92bc-957991d3505d	malikk	$2b$12$KO2sU3Yh2bB9bnhS1OxUxOJQmHOckJRXhGMUWMng/.P4XuXEvK.sS	mentalyc.com@gmail.com	Malik	K. Contractor	ic	Product Designer	\N	d264c297-6dd7-42c7-ad80-1c4eda70cac2	\N	t	\N	4	engaged	\N	\N	\N	f	{"ooo": true, "portal": true, "invoices": true, "timesheets": true}
2998c744-43bb-4633-86a1-80d576c52931	Emmanuel	$2b$12$ay.LYDMW8MtoQIdpBTyL7uYJb306KX/AqDwYFqfmMzhNzYsLE/jUi	agbaayoh@gmail.com	Emmanuel	Agba	ic	Frontend Engineer	\N	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	t	\N	1	engaged	\N	\N	Engineering Contractors	f	{"ooo": true, "portal": true, "invoices": true, "timesheets": true}
ed456247-0fe5-47d9-87c1-c2af4e1a4139	yuliya	$2b$12$dQwB1SfvPv4A5O.njlvLGO/nDSw.QyKKwvXbkxR1GAWgV/OdwyurO	yulia@mentalyc.com	Yuliya	Matusevich	ic	Product Designer	\N	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	t	\N	1	engaged	\N	\N	\N	f	{}
38cc3c9a-a1da-4aab-9408-75d1f5f4bcb8	galyna	$2b$12$deFFfeBylT4Y4HnHRmcCTO/ycfMFqusHFXymKuP1WL9NXsIBCLguO	galyna@mentalyc.com	Galyna	Korol	ic	Product Marketer	\N	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	t	\N	1	engaged	\N	\N	\N	f	{}
74e619cf-48e9-44b5-a7f9-93f813d7bedf	Adeel	$2b$12$69QTM0vvWIHnDWG99fYZBuznMKZAfdXLxWzH/CR/IMfmyBO9iDFFm	adeelatta2000@gmail.com	Adeel	Atta	ic	Frontend Engineer	\N	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	t	\N	1	engaged	\N	\N	Engineering Contractors	f	{"ooo": true, "portal": true, "invoices": true, "timesheets": true}
de794e37-6ef0-4e4c-b121-904de280aa38	Imran	$2b$12$lf5UsI3n0o3w1Yg2eIXQiuFhwc6t1oKsQkpVPm2OO47qmJSFluSNi	muhammadimranzahoor427@gmail.com	Imran	Zahoor	ic	Senior Frontend Engineer	\N	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	t	\N	1	engaged	\N	\N	Engineering Contractors	f	{"ooo": true, "portal": true, "invoices": true, "timesheets": true}
d264c297-6dd7-42c7-ad80-1c4eda70cac2	Malik	$2b$12$vRfIkO1K19cvjRNQxdvgrOMj3A9/zbwuCZUcs60dLPDE3Y.oqYonG	malik@mentalyc.com	Malik	Kabir	admin	Operations		82defca1-4380-4327-a959-474de43bf1dc	\N	t	\N	4	engaged	\N	\N	\N	f	{"ooo": true, "portal": true, "invoices": true, "timesheets": true}
73a25d2e-d024-4caf-9347-d5ca6bd9dbcc	Malik_demo	$2b$12$Rntjb6v5Pj0uBN4NZm219.m6hpoI16MaKOT3VoZ9TwTkwH73eLVCS	techmalik@yahoo.com	Malik	Demo	ic	Frontend Engineer	\N	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	t	\N	1	engaged	\N	\N	Engineering Contractors	f	{"ooo": true, "portal": true, "invoices": true, "timesheets": true}
05cb123d-2241-4695-88cd-e2969d2a22ef	Salem	$2b$12$V9nR3E4WKq8Ez55ATmPhG.X83dSCvCspz1CKcJ4eGuRWjPTsqVGl6	salemdaniel007@gmail.com	Salem	Daniel	ic	Senior MLOps Engineer	\N	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	t	\N	1	engaged	\N	\N	Engineering Contractors	f	{"portal": true, "invoices": true, "timesheets": true}
1d9304c8-2b7e-4cc1-b1b4-0c6142e4ba66	rejoice	$2b$12$t.maIXg/7JV2mAyVzU3GnelCG.HP0MxiXca54BVIidTzfaCAWf5bW	rejoice@mentalyc.com	Rejoice	Obosi	ic	Product Designer/Customer Support	\N	a23598e5-97e2-4a34-a052-6aa30e11d92b	\N	t	\N	1	engaged	\N	\N	\N	f	{}
a23598e5-97e2-4a34-a052-6aa30e11d92b	Pandu	$2b$12$sHpOv9zD7TbDR7uKvfayT.5xHMxkD55rMGJFrdBw7KbTNpzXo8QVa	raharjaliu@gmail.com	Pandu	Raharja-Liu	supervisor	Senior Engineering Manager	\N	\N	\N	t	\N	1	engaged	\N	\N	\N	f	{"portal": true, "supervisor": true}
\.


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE SET; Schema: _system; Owner: neondb_owner
--

SELECT pg_catalog.setval('_system.replit_database_migrations_v1_id_seq', 1, true);


--
-- Name: replit_database_migrations_v1 replit_database_migrations_v1_pkey; Type: CONSTRAINT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1
    ADD CONSTRAINT replit_database_migrations_v1_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: daily_entries daily_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.daily_entries
    ADD CONSTRAINT daily_entries_pkey PRIMARY KEY (id);


--
-- Name: evaluation_sections evaluation_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.evaluation_sections
    ADD CONSTRAINT evaluation_sections_pkey PRIMARY KEY (id);


--
-- Name: evaluations evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (id);


--
-- Name: feedback_invitations feedback_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feedback_invitations
    ADD CONSTRAINT feedback_invitations_pkey PRIMARY KEY (id);


--
-- Name: ic_payment_details ic_payment_details_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ic_payment_details
    ADD CONSTRAINT ic_payment_details_pkey PRIMARY KEY (id);


--
-- Name: ic_payment_details ic_payment_details_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ic_payment_details
    ADD CONSTRAINT ic_payment_details_user_id_unique UNIQUE (user_id);


--
-- Name: ic_responsibilities ic_responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ic_responsibilities
    ADD CONSTRAINT ic_responsibilities_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_unique UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ooo_requests ooo_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ooo_requests
    ADD CONSTRAINT ooo_requests_pkey PRIMARY KEY (id);


--
-- Name: overtime_requests overtime_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);


--
-- Name: timesheets timesheets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT timesheets_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: idx_replit_database_migrations_v1_build_id; Type: INDEX; Schema: _system; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_replit_database_migrations_v1_build_id ON _system.replit_database_migrations_v1 USING btree (build_id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict aClrwAA4CV7KGOUi5MSg27wl8RpPyjnH9jUtzLKlVycO4SH2JDE8VcUFCo2MGNO

