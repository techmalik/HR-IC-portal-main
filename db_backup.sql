--
-- PostgreSQL database dump
--

\restrict Tq0msdlOyL4L1YYvDxaqNHIKDzx5VO52AQfND4abRS0r6gcx7ufxa4lYrkfA7rm

-- Dumped from database version 16.10
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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: daily_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_entries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    timesheet_id character varying NOT NULL,
    date date NOT NULL,
    hours integer DEFAULT 0 NOT NULL,
    activity_log text
);


ALTER TABLE public.daily_entries OWNER TO postgres;

--
-- Name: evaluation_sections; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.evaluation_sections OWNER TO postgres;

--
-- Name: evaluations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.evaluations OWNER TO postgres;

--
-- Name: feedback_invitations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.feedback_invitations OWNER TO postgres;

--
-- Name: ic_payment_details; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ic_payment_details OWNER TO postgres;

--
-- Name: ic_responsibilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ic_responsibilities (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ic_id character varying NOT NULL,
    responsibility text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ic_responsibilities OWNER TO postgres;

--
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.invoice_line_items OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: ooo_requests; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ooo_requests OWNER TO postgres;

--
-- Name: overtime_requests; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.overtime_requests OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    token character varying NOT NULL,
    user_id character varying NOT NULL,
    username text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: timesheets; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.timesheets OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
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
e6467e1c-dcbb-4ecc-8a04-0586c4e394a7	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	User logged in	Malik Supervisor logged in	user	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	2026-01-16 08:46:58.39368
149eacaf-62a7-40c1-8541-68a18b176eb1	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-16 08:53:24.522964
955b9d2a-1e5c-425d-a34c-a9c80f66f580	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-21 16:49:49.865689
d8189c49-e57e-4c74-b7e6-b20e9bfe6cb7	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-22 11:03:26.996896
51204786-1614-4dce-8341-e85fcd5242e2	52369260-d9da-4470-b769-09659ceacf39	User logged in	Adeel Atta logged in	user	52369260-d9da-4470-b769-09659ceacf39	2026-01-22 11:08:28.926322
7acc45c6-eb11-4dba-a0ae-9da4a0fc67cf	52369260-d9da-4470-b769-09659ceacf39	Self-evaluation started	Created performance evaluation for period 2026-01-01 to 2026-01-31	evaluation	c919a453-3fa0-4955-b5ac-e331c8b8729c	2026-01-22 11:12:39.48272
2093455c-a50d-408a-a6ac-84c4cf19204c	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-01 14:05:16.558334
eb750028-eee8-4648-868d-ed1e4b39d554	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-04 11:30:17.294192
233418e9-0843-4370-a78e-884ad2ee17d9	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-02-04 11:47:18.538038
4b14b02e-e5d8-4837-863c-e951d672aa41	52369260-d9da-4470-b769-09659ceacf39	User logged in	Adeel Atta logged in	user	52369260-d9da-4470-b769-09659ceacf39	2026-02-04 11:48:10.084351
a19f8026-1afc-469b-9c3c-97c06b649259	52369260-d9da-4470-b769-09659ceacf39	User logged in	Adeel Atta logged in	user	52369260-d9da-4470-b769-09659ceacf39	2026-02-10 10:07:24.144324
b5c9ef2d-e2ce-4d25-abba-b33de865aedc	52369260-d9da-4470-b769-09659ceacf39	OOO request created	Requested time off from 2026-02-16 to 2026-02-18	ooo_request	4b3c3ada-c1c1-421d-a3f0-6e4f182898ec	2026-02-10 10:08:12.065691
02a32f37-59e9-4b5f-a2f7-33bfa4f125be	d264c297-6dd7-42c7-ad80-1c4eda70cac2	User logged in	Malik Kabir logged in	user	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-10 10:08:25.798002
8f82ad84-4340-4451-b58a-091be709d0dd	d264c297-6dd7-42c7-ad80-1c4eda70cac2	OOO request approved	Leave request was approved	ooo_request	4b3c3ada-c1c1-421d-a3f0-6e4f182898ec	2026-02-10 10:08:41.905522
02a47ba6-4177-48ac-ac7a-e101e88b217c	d264c297-6dd7-42c7-ad80-1c4eda70cac2	Overtime request approved	Overtime request was approved	overtime_request	cc12a630-0943-4466-8199-19c512fa8487	2026-02-10 10:10:40.901457
5ef53572-e38e-4068-bab5-d8f2ff7a771e	52369260-d9da-4470-b769-09659ceacf39	Self-evaluation started	Created performance evaluation for period 2026-02-01 to 2026-02-09	evaluation	cc2d4f7e-ac20-4b58-966c-8d76604406a8	2026-02-10 10:13:30.917548
031cc573-3cc1-4db4-a28f-71d4c4f91ed4	52369260-d9da-4470-b769-09659ceacf39	Self-assessment submitted	Submitted self-assessment for period 2026-01-01 to 2026-01-31	evaluation	c919a453-3fa0-4955-b5ac-e331c8b8729c	2026-02-10 10:14:10.185561
f5266781-0e1f-49e6-9697-97ffdf2bb445	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	User logged in	Pandu Raharja-Liu logged in	user	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-02-10 10:14:30.72354
\.


--
-- Data for Name: daily_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_entries (id, timesheet_id, date, hours, activity_log) FROM stdin;
d0d9b0f2-2590-4b41-aca3-cfb4604076f4	63c5047c-54b9-4e88-9d5c-a81868cf6797	2026-02-19	4	worked!
a6fbba31-c445-4f27-b004-1835e72d7d28	63c5047c-54b9-4e88-9d5c-a81868cf6797	2026-02-20	9	worked extra hard
c54c0c54-f0b5-4202-be48-e9d6de1eb124	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-07	11	worked till night\n
61658ff7-e61b-4b81-81bf-4ff230b230ec	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-12	4	Marketing
1167696e-e117-416c-aa08-4e67f325be9d	e6352dc6-1a8c-4019-852f-ee3566c37595	2026-01-10	8	Completed API integration and testing
0d4f4363-2e97-4277-8076-b2683fd715a6	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-02	4	feb
4fb136b0-05af-45e8-a875-fc6b4f410a7d	9825f063-6d1c-4749-95db-c7f7a86b570f	2026-02-10	4	fasdfa
ca7dcb0b-ac82-471f-917a-82438d881005	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-05	7	Autosave test entry
f7c31ed1-7386-497f-ae84-6940e04cee40	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-03	1	worked on a
a89a5847-54fa-4c5a-bbb8-28348b777a06	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-17	4	Weekend work test
69982851-c29c-4b59-b053-36168fc34470	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-06	8	worked 8
92c074d3-665b-4d67-b0bc-7832ad464913	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-07	8	worked 10 today
5537eba7-4f1c-47e0-b9d1-2b109abe829b	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-10	3	worked on the weekend.
8bcf6a19-1b7d-472b-b986-fda26be2dcff	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-11	7	worked on a sunday
c31c456b-d351-447a-acd7-0a0b8aba9ad4	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-12	9	worked 9 on a monday. 
\.


--
-- Data for Name: evaluation_sections; Type: TABLE DATA; Schema: public; Owner: postgres
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
6be5b90d-f987-495a-afbc-992acf9de31b	c919a453-3fa0-4955-b5ac-e331c8b8729c	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	3	asdfa	sdfads	\N	\N	\N
25883f5f-cae8-4b51-94cf-8135ca062189	c919a453-3fa0-4955-b5ac-e331c8b8729c	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	4	\N	\N	\N	\N	\N
6216c8f7-d2f3-453a-97f2-b7dff815d8b6	804c0257-6160-47a4-9e33-7f7fd272bb79	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	4	cool	cool	2	nice	nice
e5f781cf-cbe3-4cb5-b75d-3f3e125dbba5	804c0257-6160-47a4-9e33-7f7fd272bb79	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	3	cool	cool	2	nice	nice
cb4c5db8-255b-406b-af5d-170a6170d427	804c0257-6160-47a4-9e33-7f7fd272bb79	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	4	cool	cool	2	nice	nice
21744e6a-7e49-4072-b138-0d44af4a56bd	c919a453-3fa0-4955-b5ac-e331c8b8729c	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	3	\N	\N	\N	\N	\N
f153feb0-c16c-4028-a908-efa3eecf6696	804c0257-6160-47a4-9e33-7f7fd272bb79	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	3	cool	cool	3	nice	nice
b987b758-e840-4238-851d-0bc6ddf110c3	804c0257-6160-47a4-9e33-7f7fd272bb79	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	4	cool	cool	4	nice	nice
fc08a15d-cdb0-467f-a007-b5b474927959	804c0257-6160-47a4-9e33-7f7fd272bb79	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	3	cool	cool	2	nice	nice
251e267f-e476-46d5-841d-5ad1cc795e1e	d9aa3d85-6fbe-4c2f-b860-87d35bee7093	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	4	Completed key deliverables for section 5	Improve process and reduce turnaround for section 5.	3		
d7bac470-fd4f-44a1-846a-01a33a7cc7af	cc2d4f7e-ac20-4b58-966c-8d76604406a8	1	Value Creation	List all tangible deliverables (features, projects, etc.) you created since the last evaluation. How much time or other resources did each take. Provide a reflection on the impact each deliverable had on the organization.	\N	\N	\N	\N	\N	\N
86a8422f-2243-411c-8779-deb5488e8cb8	cc2d4f7e-ac20-4b58-966c-8d76604406a8	2	OKRs & Target Achievement	Explain how well your personal targets, team goals and company objectives were achieved or not in relationship to your contribution.	\N	\N	\N	\N	\N	\N
64183d16-40c6-49c5-8716-d78fb0e64752	cc2d4f7e-ac20-4b58-966c-8d76604406a8	3	Estimation & Deadlines	For each deliverable (initiatives not individual ticket), indicate whether it was completed on the agreed deadline.	\N	\N	\N	\N	\N	\N
983d4c08-4e89-4aa4-bc82-cc80cdcee41e	cc2d4f7e-ac20-4b58-966c-8d76604406a8	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	\N	\N	\N	\N	\N	\N
ad99f1ad-0220-4395-8ab2-5e923620a1a8	cc2d4f7e-ac20-4b58-966c-8d76604406a8	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	\N	\N	\N	\N	\N	\N
74fb359d-acf0-4ed7-8db9-82f3e8a9452c	cc2d4f7e-ac20-4b58-966c-8d76604406a8	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	\N	\N	\N	\N	\N	\N
a71939d7-59f1-4971-9bc3-25a86156745e	c919a453-3fa0-4955-b5ac-e331c8b8729c	4	Core Role	How reliably do you manage your core responsibilities as outlined in your responsibilities (listed above this table)?	3	\N	\N	\N	\N	\N
c791c070-ff37-4f8f-8184-9032c38b31a4	c919a453-3fa0-4955-b5ac-e331c8b8729c	5	Quality & Best Practices	For each deliverable, detail the number of iterations and feedback cycles required, including the review time needed from other team members and the number of reworks. List the best practices you followed as well as those that could have been applied more rigorously and those that you did not follow and why.	3	\N	\N	\N	\N	\N
32ffcccf-a590-405d-a951-3f71975a4101	c919a453-3fa0-4955-b5ac-e331c8b8729c	6	Initiative & Proactivity	Describe actions where you went above and beyond—learning new tools, streamlining processes, or supporting your team outside core duties. Include situations when you shared learnings with others.	3	\N	\N	\N	\N	\N
\.


--
-- Data for Name: evaluations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evaluations (id, ic_id, manager_id, period_start, period_end, experience_level_at_eval, new_experience_level, overall_self_rating, overall_manager_rating, expectations_for_next_review, manager_summary, status, created_at, ic_submitted_at, manager_submitted_at, completed_at, overall_score, outcomes) FROM stdin;
57d32d60-a72a-47d8-b24c-e6374fa53cfa	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	2026-01-01	2026-03-31	\N	\N	\N	\N	\N	\N	draft	2026-01-03 00:14:27.122273	\N	\N	\N	\N	\N
f5c17618-4777-435b-bcb8-5e583d8767e2	be1a274a-663c-45db-952c-bf75d8df53b6	6f3bbf1e-57c9-4914-88e6-390ce48668c1	2025-11-01	2026-01-02	\N	\N	\N	\N	\N	\N	draft	2026-01-03 13:58:08.985513	\N	\N	\N	\N	\N
804c0257-6160-47a4-9e33-7f7fd272bb79	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	2026-01-01	2026-01-02	\N	2	\N	\N	nicenice	nicenicenicenicenice	completed	2026-01-03 14:39:10.582568	2026-01-03 14:44:50.478	2026-01-03 14:47:18.029	2026-01-03 14:47:18.029	\N	\N
d9aa3d85-6fbe-4c2f-b860-87d35bee7093	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	2026-01-01	2026-03-31	\N	2	\N	\N	be on time.	good, try more next time.	completed	2026-01-03 00:08:50.111993	2026-01-03 00:16:32.508	2026-01-03 15:02:31.9	2026-01-03 15:02:31.9	3	{raise,bonus}
cc2d4f7e-ac20-4b58-966c-8d76604406a8	52369260-d9da-4470-b769-09659ceacf39	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-02-01	2026-02-09	\N	\N	\N	\N	\N	\N	draft	2026-02-10 10:13:30.836895	\N	\N	\N	\N	\N
c919a453-3fa0-4955-b5ac-e331c8b8729c	52369260-d9da-4470-b769-09659ceacf39	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	2026-01-01	2026-01-31	\N	\N	\N	\N	\N	\N	ic_submitted	2026-01-22 11:12:39.327388	2026-02-10 10:14:10.162	\N	\N	\N	\N
\.


--
-- Data for Name: feedback_invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback_invitations (id, evaluation_id, invited_by_id, invited_user_id, feedback, rating, status, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: ic_payment_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ic_payment_details (id, user_id, bank_name, account_holder_first_name, account_holder_last_name, account_number, routing_number, swift_code, iban_number, account_type, address, updated_at) FROM stdin;
\.


--
-- Data for Name: ic_responsibilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ic_responsibilities (id, ic_id, responsibility, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: invoice_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_line_items (id, invoice_id, description, quantity, rate, total, sort_order) FROM stdin;
21a85195-371d-4682-8983-eb3e1671e12f	3ef7aa5e-a483-4b0a-bdc2-99c73703c469	Consulting services	10	7500	75000	0
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, user_id, invoice_number, month, year, issue_date, file_name, file_url, amount, subtotal, contractor_name, contractor_address, contractor_phone, contractor_email, contractor_vat_no, bill_to_name, bill_to_address, bill_to_vat_no, bank_details, uploaded_at, status, reviewed_by, reviewed_at, review_note, timesheet_id) FROM stdin;
4fb1d253-9883-44ca-b917-8afe97d29e6d	be1a274a-663c-45db-952c-bf75d8df53b6	INV-2026-001	1	2026	2026-01-15	invoice_jan_2026.pdf	/uploads/invoice_jan_2026.pdf	112500	112500	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-02 22:37:14.907723	pending_review	\N	\N	\N	\N
3ef7aa5e-a483-4b0a-bdc2-99c73703c469	be1a274a-663c-45db-952c-bf75d8df53b6	INV-2026-002	1	2026	2026-01-03	Invoice-Alex_Johnson-INV-2026-002-January-2026.pdf	data:application/pdf;base64,JVBERi0xLjMKJbrfrOAKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUuMjc5OTk5OTk5OTk5OTcyNyA4NDEuODg5OTk5OTk5OTk5OTg2NF0KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggMjU3Ngo+PgpzdHJlYW0KMC41NjcwMDAwMDAwMDAwMDAxIHcKMCBHCkJUCi9GMSAyNCBUZgoyNy41OTk5OTk5OTk5OTk5OTc5IFRMCjAuMTE4IDAuMjI3IDAuMzczIHJnCjU2LjY5MjkxMzM4NTgyNjc3NzUgNzg1LjE5NzA4NjYxNDE3MzI1ODYgVGQKKElOVk9JQ0UpIFRqCkVUCkJUCi9GMSAxMCBUZgoxMS41IFRMCjAuMiBnCjQ2MC4wODcwODY2MTQxNzMxMzEyIDc4NS4xOTcwODY2MTQxNzMyNTg2IFRkCihEYXRlOiBKYW4gMywgMjAyNikgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKNDI0LjI4NzA4NjYxNDE3MzExOTkgNzY4LjE4OTIxMjU5ODQyNTIyODkgVGQKKEludm9pY2UgTm86IElOVi0yMDI2LTAwMikgVGoKRVQKQlQKL0YxIDggVGYKOS4xOTk5OTk5OTk5OTk5OTkzIFRMCjAuNCBnCjU2LjY5MjkxMzM4NTgyNjc3NzUgNzExLjQ5NjI5OTIxMjU5ODM4NzQgVGQKKENPTlRSQUNUT1IpIFRqCkVUCkJUCi9GMSA4IFRmCjkuMTk5OTk5OTk5OTk5OTk5MyBUTAowLjQgZwozMTEuODExMDIzNjIyMDQ3Mjg3MSA3MTEuNDk2Mjk5MjEyNTk4Mzg3NCBUZAooQklMTCBUTykgVGoKRVQKQlQKL0YyIDEwIFRmCjExLjUgVEwKMC4yIGcKNTYuNjkyOTEzMzg1ODI2Nzc3NSA2OTQuNDg4NDI1MTk2ODUwMzU3NyBUZAooQWxleCBKb2huc29uKSBUagpFVApCVAovRjIgMTAgVGYKMTEuNSBUTAowLjIgZwozMTEuODExMDIzNjIyMDQ3Mjg3MSA2OTQuNDg4NDI1MTk2ODUwMzU3NyBUZAooTWVudGFseWMgSW5jLikgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKNTYuNjkyOTEzMzg1ODI2Nzc3NSA2NjguOTc2NjE0MTczMjI4MzEzMSBUZAooRW1haWw6IGljQG1lbnRhbHljLmNvbSkgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKMzExLjgxMTAyMzYyMjA0NzI4NzEgNjgwLjMxNTE5Njg1MDM5MzcwNDIgVGQKKDIyNjEgTWFya2V0IFN0cmVldCAjNDU2OSkgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKMzExLjgxMTAyMzYyMjA0NzI4NzEgNjY4Ljk3NjYxNDE3MzIyODMxMzEgVGQKKFNhbiBGcmFuY2lzY28gQ0EgOTQxMTQpIFRqCkVUCjAuMTIgMC4yMyAwLjM3IHJnCjU2LjY5MjkxMzM4NTgyNjc3NzUgNjI5LjI5MTU3NDgwMzE0OTYxNSA0ODEuODk0MTczMjI4MzQ2NDAzNCAtMjIuNjc3MTY1MzU0MzMwNzExIHJlCmYKQlQKL0YxIDkgVGYKMTAuMzQ5OTk5OTk5OTk5OTk5NiBUTAoxLiBnCjYyLjM2MjIwNDcyNDQwOTQ1MTcgNjEzLjcwMTAyMzYyMjA0NzE1OTcgVGQKKERlc2NyaXB0aW9uKSBUagpFVApCVAovRjEgOSBUZgoxMC4zNDk5OTk5OTk5OTk5OTk2IFRMCjEuIGcKMzQwLjE1NzQ4MDMxNDk2MDY1MSA2MTMuNzAxMDIzNjIyMDQ3MTU5NyBUZAooUXR5KSBUagpFVApCVAovRjEgOSBUZgoxMC4zNDk5OTk5OTk5OTk5OTk2IFRMCjEuIGcKNDExLjAyMzYyMjA0NzI0NDE0NiA2MTMuNzAxMDIzNjIyMDQ3MTU5NyBUZAooUmF0ZSkgVGoKRVQKQlQKL0YxIDkgVGYKMTAuMzQ5OTk5OTk5OTk5OTk5NiBUTAoxLiBnCjUxMy4wMjc3OTUyNzU1OTA1MDYyIDYxMy43MDEwMjM2MjIwNDcxNTk3IFRkCihUb3RhbCkgVGoKRVQKQlQKL0YxIDkgVGYKMTAuMzQ5OTk5OTk5OTk5OTk5NiBUTAowLjIgZwo2Mi4zNjIyMDQ3MjQ0MDk0NTE3IDU5NS4yNzU4MjY3NzE2NTM1NTU2IFRkCihDb25zdWx0aW5nIHNlcnZpY2VzKSBUagpFVApCVAovRjEgOSBUZgoxMC4zNDk5OTk5OTk5OTk5OTk2IFRMCjAuMiBnCjM0MC4xNTc0ODAzMTQ5NjA2NTEgNTk1LjI3NTgyNjc3MTY1MzU1NTYgVGQKKDEwKSBUagpFVApCVAovRjEgOSBUZgoxMC4zNDk5OTk5OTk5OTk5OTk2IFRMCjAuMiBnCjQxMS4wMjM2MjIwNDcyNDQxNDYgNTk1LjI3NTgyNjc3MTY1MzU1NTYgVGQKKCQ3NS4wMCkgVGoKRVQKQlQKL0YxIDkgVGYKMTAuMzQ5OTk5OTk5OTk5OTk5NiBUTAowLjIgZwo1MDAuNjk3Nzk1Mjc1NTkwNDY1MyA1OTUuMjc1ODI2NzcxNjUzNTU1NiBUZAooJDc1MC4wMCkgVGoKRVQKMC45IEcKNTYuNjkyOTEzMzg1ODI2Nzc3NSA1ODkuNjA2NTM1NDMzMDcwODAzMyBtCjUzOC41ODcwODY2MTQxNzMxMzEyIDU4OS42MDY1MzU0MzMwNzA4MDMzIGwKUwpCVAovRjEgMTAgVGYKMTEuNSBUTAowLjIgZwo0MjUuMjAxMjU5ODQyNTE5NjE4OCA1NDQuMjUyMjA0NzI0NDA5NDY2NSBUZAooU3ViLVRvdGFsOikgVGoKRVQKQlQKL0YxIDEwIFRmCjExLjUgVEwKMC4yIGcKNDk3LjExNzc5NTI3NTU5MDUzOCA1NDQuMjUyMjA0NzI0NDA5NDY2NSBUZAooJDc1MC4wMCkgVGoKRVQKMC4xMiAwLjIzIDAuMzcgUkcKMzY4LjUwODM0NjQ1NjY5MjgzNDIgNTI3LjI0NDMzMDcwODY2MTMyMzEgbQo1MzguNTg3MDg2NjE0MTczMTMxMiA1MjcuMjQ0MzMwNzA4NjYxMzIzMSBsClMKQlQKL0YyIDEyIFRmCjEzLjc5OTk5OTk5OTk5OTk5ODkgVEwKMC4xMTggMC4yMjcgMC4zNzMgcmcKNDI1LjIwMTI1OTg0MjUxOTYxODggNTEwLjIzNjQ1NjY5MjkxMzM1MDMgVGQKKEJhbGFuY2UgRHVlOikgVGoKRVQKQlQKL0YyIDEyIFRmCjEzLjc5OTk5OTk5OTk5OTk5ODkgVEwKMC4xMTggMC4yMjcgMC4zNzMgcmcKNDg5Ljk1Nzc5NTI3NTU5MDUxMyA1MTAuMjM2NDU2NjkyOTEzMzUwMyBUZAooJDc1MC4wMCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoxIDAgb2JqCjw8L1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUiBdCi9Db3VudCAxCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvSGVsdmV0aWNhCi9TdWJ0eXBlIC9UeXBlMQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwovRmlyc3RDaGFyIDMyCi9MYXN0Q2hhciAyNTUKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZAovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iago3IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvSGVsdmV0aWNhLU9ibGlxdWUKL1N1YnR5cGUgL1R5cGUxCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCi9GaXJzdENoYXIgMzIKL0xhc3RDaGFyIDI1NQo+PgplbmRvYmoKOCAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkT2JsaXF1ZQovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iago5IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvQ291cmllcgovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iagoxMCAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL0NvdXJpZXItQm9sZAovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iagoxMSAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL0NvdXJpZXItT2JsaXF1ZQovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iagoxMiAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL0NvdXJpZXItQm9sZE9ibGlxdWUKL1N1YnR5cGUgL1R5cGUxCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCi9GaXJzdENoYXIgMzIKL0xhc3RDaGFyIDI1NQo+PgplbmRvYmoKMTMgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL0Jhc2VGb250IC9UaW1lcy1Sb21hbgovU3VidHlwZSAvVHlwZTEKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKL0ZpcnN0Q2hhciAzMgovTGFzdENoYXIgMjU1Cj4+CmVuZG9iagoxNCAwIG9iago8PAovVHlwZSAvRm9udAovQmFzZUZvbnQgL1RpbWVzLUJvbGQKL1N1YnR5cGUgL1R5cGUxCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCi9GaXJzdENoYXIgMzIKL0xhc3RDaGFyIDI1NQo+PgplbmRvYmoKMTUgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL0Jhc2VGb250IC9UaW1lcy1JdGFsaWMKL1N1YnR5cGUgL1R5cGUxCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCi9GaXJzdENoYXIgMzIKL0xhc3RDaGFyIDI1NQo+PgplbmRvYmoKMTYgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL0Jhc2VGb250IC9UaW1lcy1Cb2xkSXRhbGljCi9TdWJ0eXBlIC9UeXBlMQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZwovRmlyc3RDaGFyIDMyCi9MYXN0Q2hhciAyNTUKPj4KZW5kb2JqCjE3IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvWmFwZkRpbmdiYXRzCi9TdWJ0eXBlIC9UeXBlMQovRmlyc3RDaGFyIDMyCi9MYXN0Q2hhciAyNTUKPj4KZW5kb2JqCjE4IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9CYXNlRm9udCAvU3ltYm9sCi9TdWJ0eXBlIC9UeXBlMQovRmlyc3RDaGFyIDMyCi9MYXN0Q2hhciAyNTUKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1Byb2NTZXQgWy9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUldCi9Gb250IDw8Ci9GMSA1IDAgUgovRjIgNiAwIFIKL0YzIDcgMCBSCi9GNCA4IDAgUgovRjUgOSAwIFIKL0Y2IDEwIDAgUgovRjcgMTEgMCBSCi9GOCAxMiAwIFIKL0Y5IDEzIDAgUgovRjEwIDE0IDAgUgovRjExIDE1IDAgUgovRjEyIDE2IDAgUgovRjEzIDE3IDAgUgovRjE0IDE4IDAgUgo+PgovWE9iamVjdCA8PAo+Pgo+PgplbmRvYmoKMTkgMCBvYmoKPDwKL1Byb2R1Y2VyIChqc1BERiAzLjAuNCkKL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDEwMzE3MDgwMS0wMCcwMCcpCj4+CmVuZG9iagoyMCAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMSAwIFIKL09wZW5BY3Rpb24gWzMgMCBSIC9GaXRIIG51bGxdCi9QYWdlTGF5b3V0IC9PbmVDb2x1bW4KPj4KZW5kb2JqCnhyZWYKMCAyMQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDI3ODAgMDAwMDAgbiAKMDAwMDAwNDU5NyAwMDAwMCBuIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxNTIgMDAwMDAgbiAKMDAwMDAwMjgzNyAwMDAwMCBuIAowMDAwMDAyOTYyIDAwMDAwIG4gCjAwMDAwMDMwOTIgMDAwMDAgbiAKMDAwMDAwMzIyNSAwMDAwMCBuIAowMDAwMDAzMzYyIDAwMDAwIG4gCjAwMDAwMDM0ODUgMDAwMDAgbiAKMDAwMDAwMzYxNCAwMDAwMCBuIAowMDAwMDAzNzQ2IDAwMDAwIG4gCjAwMDAwMDM4ODIgMDAwMDAgbiAKMDAwMDAwNDAxMCAwMDAwMCBuIAowMDAwMDA0MTM3IDAwMDAwIG4gCjAwMDAwMDQyNjYgMDAwMDAgbiAKMDAwMDAwNDM5OSAwMDAwMCBuIAowMDAwMDA0NTAxIDAwMDAwIG4gCjAwMDAwMDQ4NDUgMDAwMDAgbiAKMDAwMDAwNDkzMSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDIxCi9Sb290IDIwIDAgUgovSW5mbyAxOSAwIFIKL0lEIFsgPEFFMUJGOTI3MEJCMTQ4RUZBOTAzMjFFRjlCOEZEMkNDPiA8QUUxQkY5MjcwQkIxNDhFRkE5MDMyMUVGOUI4RkQyQ0M+IF0KPj4Kc3RhcnR4cmVmCjUwMzUKJSVFT0Y=	75000	75000	Alex Johnson			ic@mentalyc.com	\N	Mentalyc Inc.	2261 Market Street #4569\nSan Francisco CA 94114	\N	\N	2026-01-03 17:08:01.129643	pending_review	\N	\N	\N	\N
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_preferences (id, user_id, in_app_enabled, email_enabled, ooo_notifications, timesheet_notifications, overtime_notifications, invoice_notifications, deadline_reminders, evaluation_notifications, team_action_notifications) FROM stdin;
44d8193d-1e46-4ebf-950d-aa4f96716e7f	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	t	f	t	t	t	t	t	t	t
eb6e71ef-f42e-423d-9062-d2316361475e	test-supervisor-001	t	f	t	t	t	t	t	t	t
c7d6cecd-3900-48a0-9fee-3a4df613ceb0	test-ic-user-001	t	f	t	t	t	t	t	t	t
82db1287-04be-4642-a5e7-514dc4c2f81d	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	t	t	t	t	t	t	t	t	t
ccf87786-ea5d-449d-8aeb-cedef009954b	d264c297-6dd7-42c7-ad80-1c4eda70cac2	t	t	t	t	t	t	t	t	t
2bcf61b9-195c-47b5-97ad-d29083d3d746	52369260-d9da-4470-b769-09659ceacf39	t	t	t	t	t	t	t	t	t
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
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
d7102d78-08bd-4633-b24e-4931e75576c9	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	evaluation_created	New Performance Evaluation	A new performance evaluation has been created for you. Please complete your self-assessment.	evaluation	804c0257-6160-47a4-9e33-7f7fd272bb79	t	2026-01-03 14:39:10.639399
86859626-2a52-4eba-bb77-ed77c62d0af4	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	evaluation_completed	Evaluation Finalized	Your performance evaluation has been completed by Michael Chen.	evaluation	804c0257-6160-47a4-9e33-7f7fd272bb79	t	2026-01-03 14:47:18.039314
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
917133af-d71a-4d81-ab09-423e3e192dab	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: i dont accept it. 	overtime_request	46c0a88f-507b-4b79-b23e-cc353b7dcd81	t	2026-01-03 15:08:12.867023
7521a6c1-2c6d-4a05-95a5-a983fb7da468	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	47b128c5-4f6d-4d22-8c99-6ab6fdbdc3dd	t	2026-01-15 12:57:28.086097
bc651282-58ae-4ce0-844c-1e256a163ec6	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	83769e70-41e2-457f-8573-ee0ce96937df	t	2026-01-15 13:03:54.982852
b246988d-a0b1-4ea5-b810-de26a7f31f55	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	24337aa5-3376-4828-ab39-557e6c8dcf8d	t	2026-01-15 13:12:59.66105
b9cea308-a1a3-445b-94e2-dc85b4c689d2	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: no no!	overtime_request	b1c200ec-214a-4f01-b496-517e431682be	t	2026-01-03 15:28:49.405665
f6341d34-5725-4e14-9dae-7d81bba9909a	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	overtime_approved	Overtime Request Approved	Your overtime request was approved: 13 hours	overtime_request	28aa2d6c-930a-474e-a743-b69af401171b	t	2026-01-03 15:54:49.566113
14278af2-873b-4a64-91e5-aecdea25e201	d264c297-6dd7-42c7-ad80-1c4eda70cac2	82defca1-4380-4327-a959-474de43bf1dc	timesheet_approved	Timesheet Approved	Your timesheet has been approved by Michael Chen	timesheet	e6352dc6-1a8c-4019-852f-ee3566c37595	t	2026-01-03 16:44:24.573398
3a5b3cb8-b54b-4f22-8643-45399f782729	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	overtime_rejected	Overtime Request Rejected	Your overtime request was rejected: didn't work that much	overtime_request	04162dc6-53c8-457a-a14a-5f1bb18af6cc	t	2026-01-03 21:58:40.333711
ca62fb4b-3b1f-48f1-821a-c3c5eaea59ae	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	cc02c639-8100-41e7-a24b-9051f5908f83	t	2026-01-15 13:45:28.559917
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
dcad59e8-c057-476f-bb55-3862d5f2b4a3	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	52369260-d9da-4470-b769-09659ceacf39	evaluation_created	Self-Evaluation Started	Adeel Atta has started a self-evaluation and will submit it for your review.	evaluation	c919a453-3fa0-4955-b5ac-e331c8b8729c	f	2026-01-22 11:12:39.497096
a43bc873-d7d7-48e0-b158-1b660609ceed	d264c297-6dd7-42c7-ad80-1c4eda70cac2	52369260-d9da-4470-b769-09659ceacf39	ooo_submitted	New OOO Request	Adeel Atta submitted an OOO request	ooo_request	4b3c3ada-c1c1-421d-a3f0-6e4f182898ec	f	2026-02-10 10:08:12.073457
a3cebbb0-5005-434a-bb13-51f20204b4ea	52369260-d9da-4470-b769-09659ceacf39	d264c297-6dd7-42c7-ad80-1c4eda70cac2	ooo_approved	OOO Request Approved	Your OOO request has been approved by Malik Kabir	ooo_request	4b3c3ada-c1c1-421d-a3f0-6e4f182898ec	f	2026-02-10 10:08:41.916249
54074d0e-b14e-4024-a7e2-a7d2325ca1e0	52369260-d9da-4470-b769-09659ceacf39	d264c297-6dd7-42c7-ad80-1c4eda70cac2	overtime_approved	Overtime Request Approved	Your overtime request was approved: 8 hours	overtime_request	cc12a630-0943-4466-8199-19c512fa8487	f	2026-02-10 10:10:40.915545
d962db5a-1d66-48eb-a126-8e65f483ae67	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	52369260-d9da-4470-b769-09659ceacf39	evaluation_created	Self-Evaluation Started	Adeel Atta has started a self-evaluation and will submit it for your review.	evaluation	cc2d4f7e-ac20-4b58-966c-8d76604406a8	f	2026-02-10 10:13:30.922381
c12c320c-7a4d-4ad1-8e33-6d981a75102d	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	52369260-d9da-4470-b769-09659ceacf39	evaluation_ic_submitted	Self-Assessment Submitted	Adeel Atta has submitted their self-assessment. Please review and complete the evaluation.	evaluation	c919a453-3fa0-4955-b5ac-e331c8b8729c	t	2026-02-10 10:14:10.16774
\.


--
-- Data for Name: ooo_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ooo_requests (id, user_id, manager_id, start_date, end_date, ooo_type, reason, status, reviewed_by, reviewed_at, review_note) FROM stdin;
2dafd073-d009-46dc-a949-b95174b22590	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	2026-01-21	2026-01-21	full_day	Cross-account test workflow	approved	82defca1-4380-4327-a959-474de43bf1dc	2026-01-02 23:32:29.079	Approved for vacation
c659aa80-746e-4332-ab41-7bf81e7d5e5b	be1a274a-663c-45db-952c-bf75d8df53b6	82defca1-4380-4327-a959-474de43bf1dc	2026-02-10	2026-02-12	full_day	Testing rejection workflow	rejected	82defca1-4380-4327-a959-474de43bf1dc	2026-01-02 23:39:54.612	Request conflicts with project deadline
47b128c5-4f6d-4d22-8c99-6ab6fdbdc3dd	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-19	2026-01-22	full_day	good time	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 12:57:28.072	good
83769e70-41e2-457f-8573-ee0ce96937df	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-20	2026-01-23	full_day	yep, again!	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 13:03:54.969	okay good.
24337aa5-3376-4828-ab39-557e6c8dcf8d	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-28	2026-01-29	full_day		approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 13:12:59.633	aesome
cc02c639-8100-41e7-a24b-9051f5908f83	bfad93d3-95ed-4a97-b87e-f45872d0cbb6	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-22	2026-01-23	full_day		approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-01-15 13:45:28.534	good boy
4b3c3ada-c1c1-421d-a3f0-6e4f182898ec	52369260-d9da-4470-b769-09659ceacf39	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-16	2026-02-18	full_day	Sick	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-10 10:08:41.899	approved\n
\.


--
-- Data for Name: overtime_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.overtime_requests (id, user_id, timesheet_id, date, requested_hours, approved_hours, status, reviewed_by, reviewed_at, review_note, created_at, is_weekend_work) FROM stdin;
cc12a630-0943-4466-8199-19c512fa8487	52369260-d9da-4470-b769-09659ceacf39	63c5047c-54b9-4e88-9d5c-a81868cf6797	2026-02-20	9	8	approved	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2026-02-10 10:10:40.896	\N	2026-02-10 10:09:35.304308	f
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
96d37225-bd52-4ccb-8e06-a7039b201017	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-17	4	\N	pending	\N	\N	\N	2026-01-15 08:10:20.795294	t
cc768a2a-7dfd-4629-95f4-b3eb775bd14c	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-07	10	\N	pending	\N	\N	\N	2026-01-15 08:25:47.633054	f
9d2f140b-512d-4153-8af2-8428009c477d	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-07	10	\N	rejected	test-supervisor-001	2026-01-15 08:29:16.643	rejected please. 	2026-01-15 08:25:47.99403	f
5fba0bd7-9c28-4440-847c-a11215a6b656	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-10	3	\N	pending	\N	\N	\N	2026-01-15 08:31:28.673059	t
c1542201-85dd-4846-895b-0b9181820663	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-11	7	\N	pending	\N	\N	\N	2026-01-15 08:33:58.396959	t
aecbf750-8ee1-46db-b2bc-d07558a0b0e5	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-12	9	\N	pending	\N	\N	\N	2026-01-15 08:34:09.468458	f
d70be991-7627-4581-9ccd-1d7439bb34d8	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-12	9	\N	pending	\N	\N	\N	2026-01-15 08:34:09.827156	f
25704dae-c1e5-4bc8-afdb-b654c8f95931	test-ic-user-001	2604ef17-c311-4805-94ba-7de56c7d7848	2026-01-03	1	1	approved	test-supervisor-001	2026-01-15 08:35:16.44	\N	2026-01-15 08:10:20.782519	t
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (token, user_id, username, created_at, expires_at) FROM stdin;
d84932b0bcbf6660a9c9e200d549f3ba887ef5637c75b4f03660b033b018ee47	52369260-d9da-4470-b769-09659ceacf39	Adeel	2026-02-10 10:07:24.104	2026-02-11 10:07:24.104
b8253e8f724f0e4d495fa491fba734611948a498b4f790e307525e6a1c7ccdbc	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Pandu	2026-02-10 10:14:30.72	2026-02-11 10:14:30.72
9d8c0d60cc4b3560f5d1f803ccbb3b04196f5f4135e4816bffbbf0df46114095	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Pandu	2026-02-04 11:47:18.502	2026-02-05 11:47:18.502
\.


--
-- Data for Name: timesheets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timesheets (id, user_id, month, year, total_hours, status, submitted_at, reviewed_by, reviewed_at, review_note) FROM stdin;
e6352dc6-1a8c-4019-852f-ee3566c37595	d264c297-6dd7-42c7-ad80-1c4eda70cac2	1	2026	23	approved	2026-01-03 16:41:05.703	82defca1-4380-4327-a959-474de43bf1dc	2026-01-03 16:44:24.482	good
9825f063-6d1c-4749-95db-c7f7a86b570f	d264c297-6dd7-42c7-ad80-1c4eda70cac2	2	2026	8	draft	\N	\N	\N	\N
2604ef17-c311-4805-94ba-7de56c7d7848	test-ic-user-001	1	2026	47	draft	\N	\N	\N	\N
63c5047c-54b9-4e88-9d5c-a81868cf6797	52369260-d9da-4470-b769-09659ceacf39	2	2026	13	draft	\N	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, email, first_name, last_name, role, job_title, team, supervisor_id, manager_id, is_active, avatar_url, experience_level, contractor_status, hourly_rate, monthly_cap, contractor_category, must_change_password, completed_onboarding) FROM stdin;
52369260-d9da-4470-b769-09659ceacf39	Adeel	$2b$12$tlTyITcxgNz446ePwffuE.IKIvrt.JtZ8VzcDwvI6vn4CDT7YKWHO	adeelatta2000@gmail.com	Adeel	Atta	ic	Frontend Engineer	\N	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	t	\N	1	engaged	\N	\N	\N	f	{"ooo": true, "portal": true, "invoices": true, "timesheets": true}
bfad93d3-95ed-4a97-b87e-f45872d0cbb6	malik_supervisor	$2b$12$6P1Kw1C66Uvg/AxtTZNWhe0Bp11eX/prYrg.Ain0v3fXauit7ipZq	techmaleek@gmail.com	Malik	Supervisor	ic	Operations Supervisor		d264c297-6dd7-42c7-ad80-1c4eda70cac2	\N	t	\N	1	engaged	\N	\N	\N	f	{"ooo": true, "portal": true, "timesheets": true}
b05db02a-2ea0-407b-bd83-afd8a872bde4	Zunaira	$2b$12$MUdKd.SQNG45wia5nQl0suT09AxHqCc24by/eNmuJrByxhldr/Zy.	Zunizubair445@gmail.com	Zunaira	Zubair	ic	Manual QA tester	\N	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	t	\N	1	engaged	\N	\N	\N	t	{}
ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	Pandu	$2b$12$Kk729rYy7FpvbJvoNxxAsOguorNb16RrLZluBJsMFI6zal2ZvX6fS	pandu@mentalyc.com	Pandu	Raharja-Liu	ic	Senior Engineering Manager	\N	\N	\N	t	\N	1	engaged	\N	\N	Engineering Contractors	f	{"portal": true, "supervisor": true}
9a86bcee-3782-40c8-b23c-e855639f22c0	David	$2b$12$EEJI2sxZ7Y0IPu.fpwmhEusAcFaKVC.35.dVXxws6T/TZNbB/Vov6	aniebovictor001@gmail.com	David	Aniebo	ic	QA Engineer	\N	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	t	\N	1	engaged	\N	\N	\N	f	{}
7247837c-37d3-4cd3-84c8-0997fcd77393	Imran	$2b$12$qkBeAsPlUv0niGl2PjGny.aw.OUnumHHKq3/EUE84e3PQ9aDuLZAG	muhammadimranzahoor427@gmail.com	Imran	Zahoor	ic	Senior Frontend Engineer	\N	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	t	\N	1	engaged	\N	\N	\N	f	{}
46008b81-b974-4f7c-a474-9f8fc901b5c2	Naveen	$2b$12$hCTlR4jrwY8xSc.JoAlUb.5AvNMSu6SbFUDwRq8f5LdXITT6iayIq	navis9991@gmail.com	Naveen	Kumar Srinivasan	ic	Machine Learning Ops Engineering (Part-time)	\N	\N	\N	t	\N	1	engaged	\N	\N	\N	f	{}
dd225f63-805d-4f9a-be83-ce9bfa5f48f8	Samuel	$2b$12$XiyBIyTzSs/mmVS/NR250.Vla7kpYPKTIsT0TNdGjR/kxVMv9QJQS	samuellyworld@gmail.com	Samuel	Tosin	ic	Frontend Engineer	\N	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	t	\N	1	engaged	\N	\N	\N	f	{}
2b6babea-e138-4a6c-8855-d8fe6949a42b	Tobi	$2b$12$YkToZqZRFZkX3icw3u0oiu2vLnxXDiIxDREEgrOtNQh5ZXIiVVeTu	krisella74@gmail.com	Tobi	Oyeleye	ic	Frontend Engineer	\N	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	t	\N	1	engaged	\N	\N	\N	f	{}
606c6a4d-1ec6-4ba9-97db-3e57ab041780	Salem	$2b$12$2oKlPTtC0kuux/R2qmqWCu.vMIgJANJYFMm7DV5vUM6hckMRgAOeC	salemdaniel007@gmail.com	Salem	Daniel	ic	Senior MLOps Engineer	\N	ae3f7dd9-7bc4-472f-a66d-c36662d0fc94	\N	t	\N	1	engaged	\N	\N	\N	f	{}
test-ic-user-001	test_ic_user	$2b$12$9nFAd64XUAxRHjchVMM5YeHklIsaiRDbaC9Ydw1ObyO/ohHiwErVq	test.ic@example.com	Test	ICUser	ic	\N	\N	test-supervisor-001	\N	t	\N	1	engaged	\N	\N	\N	f	{"ooo": true, "portal": true, "invoices": true, "timesheets": true}
test-supervisor-001	test_supervisor	$2b$12$9nFAd64XUAxRHjchVMM5YeHklIsaiRDbaC9Ydw1ObyO/ohHiwErVq	test.supervisor@example.com	Test	Supervisor	ic	\N	\N	\N	\N	t	\N	1	engaged	\N	\N	\N	f	{"portal": true, "supervisor": true}
d264c297-6dd7-42c7-ad80-1c4eda70cac2	Malik	$2b$12$vRfIkO1K19cvjRNQxdvgrOMj3A9/zbwuCZUcs60dLPDE3Y.oqYonG	malik@mentalyc.com	Malik	Kabir	admin	Operations		82defca1-4380-4327-a959-474de43bf1dc	\N	t	\N	4	engaged	\N	\N	\N	f	{"ooo": true, "portal": true, "timesheets": true}
\.


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: daily_entries daily_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_entries
    ADD CONSTRAINT daily_entries_pkey PRIMARY KEY (id);


--
-- Name: evaluation_sections evaluation_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluation_sections
    ADD CONSTRAINT evaluation_sections_pkey PRIMARY KEY (id);


--
-- Name: evaluations evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (id);


--
-- Name: feedback_invitations feedback_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_invitations
    ADD CONSTRAINT feedback_invitations_pkey PRIMARY KEY (id);


--
-- Name: ic_payment_details ic_payment_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ic_payment_details
    ADD CONSTRAINT ic_payment_details_pkey PRIMARY KEY (id);


--
-- Name: ic_payment_details ic_payment_details_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ic_payment_details
    ADD CONSTRAINT ic_payment_details_user_id_unique UNIQUE (user_id);


--
-- Name: ic_responsibilities ic_responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ic_responsibilities
    ADD CONSTRAINT ic_responsibilities_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_unique UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ooo_requests ooo_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ooo_requests
    ADD CONSTRAINT ooo_requests_pkey PRIMARY KEY (id);


--
-- Name: overtime_requests overtime_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);


--
-- Name: timesheets timesheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT timesheets_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- PostgreSQL database dump complete
--

\unrestrict Tq0msdlOyL4L1YYvDxaqNHIKDzx5VO52AQfND4abRS0r6gcx7ufxa4lYrkfA7rm

