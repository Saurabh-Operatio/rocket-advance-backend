// status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  CONFLICT: 409,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  NO_CONTENT: 204,
  TOO_MANY_REQUESTS: 400,
};

// api response messages
export const MESSAGES = {
  INVALID_QUERY: "Invalid filter query option.",
  INVALID_TOKEN: "Invalid access token.",
  USER_EXISTS:
    "An account with your information already exists, please sign in instead.",
  USER_NOT_FOUND: "User not exist.",
  REGISTRATION_SUCCESS: "Your account was successfully created!",
  INVALID_CREDENTIALS:
    "The email or password don't match our records, please try again.",
  UNAUTHORIZED: "Unauthorized",
  LOGIN_SUCCESS: "Login successful",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  ROUTE_NOT_FOUND: "Route not found.",
  ENVS_LOADED: "Enviroment variables loaded.",
  ENVS_LOADED_BY_OS: "Env is injected by OS into node process",
  NO_MORE_CONTENT: "No more content.",
  DEALS_FETCHED: "Deals fetched successfully",
  LEAD_FORM: "Lead Form fetched",
  NEW_DEAL_URL: "New deal url.",
  ACTION_FETCHED: "Pending actions fetched successfully",
  DOCS_FETCHED: "Documents fetched successfully",
  COMMISION_FETCHED: "Commisions fetched successfully",
  STATS_FETCHED: "Stats fetched successfully.",
  NEW_DEALS: "New deals fetched",
  FUNDED_DEALS: "Funded deals fetched",
  DEALS_COUNT: "Open and Closed deals count fetched",
  BROKER_DETAILS_FETCHED: "Broker details fetched",
};

export const ERROR_MESSAGES = {
  MONGO_URI: "Mongo Uri not found.",
  ENV_LOAD: "Error while loading env.Error while loading environment variables",
  INVALID_HTTP_METHOD: "Invalid HTTP method",
  INVALID_URL: "Invalid HTTP URL",
  HTTP_REQUEST: "Error while perfroming http request.",
  ZOHO_ACCESS_TOKEN_EXPIRED: "Zoho access token is expired.",
};

export const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  STAGE: "stage",
};

// message templates and markers for template
export const MESSAGE_TEMPLATES = {
  NO_PERM_REGISTER:
    "contact support as no {USERPLACEHOLDER} email exists for this email.",
  NO_USER_IN_CRM:
    "No record was found for the entered email. If you require assistance, please contact us at 1-844-606-0928 or email us at info@rocketadvance.ca.",
};

export const MESSAGE_PLACEHOLDER = {
  USERPLACEHOLDER: "{USERPLACEHOLDER}",
};

// routes
export const ROUTES = {
  ROOT: "/",
  API: "/api",
  USER: "/user",
  REGISTER: "/register",
  LOGIN: "/login",
  DESHBOARD_TEST: "/deshboard_test",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  // agent routes
  AGENT: "/agent",
  DEALS: "/deals",
  DEALS_COUNT: "/deals-count",
  COMMISIONS: "/commisions",
  NEW_DEAL: "/new-deal",
  ACTIONS: "/actions",
  DOCS: "/docs",
  OFFER_WIDGETS: "/offer-widgets",

  // broker routes
  BROKER: "/broker",
  DEALS_STATS: "/deals-stats",
  COMMISSION_ADVANCED: "/commission-advanced",

  // investor routes
  INVESTOR: "/investor",
  STATS: "/stats",
  NEW_DEALS_STATS: "/new-deals-stats",
  NEW_DEALS: "/new-deals",
  FUNDED_DEALS: "/funded-deals",

  // referal partner routes
  REFERRAL: "/referral",
  LEAD_FORM: "/lead-form",
};

// zoho paths
export const ZOHO_API_PATHS = {
  CONTACTS: "/Contacts",
  SEARCH: "/search",
  DEALS: "/Deals",
  BROKERAGE: "/Brokerage",
  INVESTOR: "/Investor",
  REFERRAL: "/Referral",
};

// user roles
export const USER_ROLES = {
  BROKER: "broker",
  BROKER_ADMIN: "broker-admin",
  AGENT: "agent",
  REFERRAL: "referral",
  INVESTOR: "investor",
};

// Env keys
export const ENV_KEYS = {
  MONGO_URI: "MONGO_URI",
  JWT_SECRET: "JWT_SECRET",
  ENV: "ENV",
  ZOHO_CLIENT_ID: "ZOHO_CLIENT_ID",
  ZOHO_CLIENT_SECRET: "ZOHO_CLIENT_SECRET",
  ZOHO_REFRESH_TOKEN: "ZOHO_REFRESH_TOKEN",
  ZOHO_ACCESS_TOKEN: "ZOHO_ACCESS_TOKEN",
  REDIRECTION_URL: "REDIRECTION_URL",
  ZOHO_CRM_BASE_API_URL: "ZOHO_CRM_BASE_API_URL",
  ZOHO_ACCESS_TOKEN_GENERTOR_URL: "ZOHO_ACCESS_TOKEN_GENERTOR_URL",
  REDIS_HOST: "REDIS_HOST",
  REDIS_PORT: "REDIS_PORT",
  REDIS_TTL: "REDIS_TTL",
  SENDGRID_API_KEY: "SENDGRID_API_KEY",
};

// http methods
export const HTTP_VERBS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
};

// zoho response codes for differnts types of responses from zoho apis
export const ZOHO_RESPONSE_CODES = {
  INVALID_TOKEN: "INVALID_TOKEN",
};

// system calls error codes
export const SYSTEM_CALL_ERROR_CODES = {
  ENOENT: "ENOENT",
};

export const ZOHO = {
  ACCESS_TOKEN_PRE_TEXT: "Zoho-oauthtoken",
  SUPPORTING_DOC_TYPE_STATUS_AWAITING: "Awaiting to Upload",
};

export const BROKER_PROFILE_FIELDS =
  "Bank_Account_Number,Bank_Name,Branch_Number,direct_deposit_information_form,Street,City,State,Zip_Code,Country,void_cheque_form,Payout_Broker_Fee,Payout_Broker_Fee_Month,Broker_of_Record_Full_Name,Broker_Administrator_Full_Name";

export const REFERRAL_FIELDS = "Short_Lead_Referral_Form,Lead_Shortened_Cuttly";

// deals data selection fields for all user roles
export const DEALS_FIELDS_FOR_ALL =
  "Deal_Name,Stage,Total_Commision,Property_Street_Address,unique_deal_number1,Closing_Date,Stage_Funded_Date,Supporting_Doc_1_Type,Supporting_Doc_1_Status,Supporting_Doc_2_Type,Supporting_Doc_2_Status,Request_Amendment_Form,Created_Time,Submit_Supporting_Doc_1_Form,Submit_Supporting_Doc_2_Form,Due_Date,Rocket_Advance_Net_Advance,Rocket_Advance_Contribution,Verification_Form_Submitted,Verification_Form,Client_Gets";

export const EXTRA_FILED_BROKER_DEALS =
  "Investor1,Investor_Income,Investor_ROI,Inv_of_Income,Inv_Income_per_Day,Contact_Name,Property_Street_Address";

export const ALL_ROLE_DEAL_FIELDS = `id,investor_investing_in_deal_form,Property_City,Duration_of_Advance,${DEALS_FIELDS_FOR_ALL},${EXTRA_FILED_BROKER_DEALS}`;

export const EXTRA_FIELDS_INVESTOR_DEALS = "Date_of_Advance";

export const REFERRAL_CONTACTS_FIELDS =
  "Mailing_Street,Mailing_City,Mailing_State,Mailing_Zip,Mailing_Country,Full_Name,Email/id";

// deals fields
export const DEAL_FIELDS: Record<string, string> = {
  agent: DEALS_FIELDS_FOR_ALL,
  broker: `${DEALS_FIELDS_FOR_ALL},${EXTRA_FILED_BROKER_DEALS}`,
  ["broker-admin"]: `${DEALS_FIELDS_FOR_ALL},${EXTRA_FILED_BROKER_DEALS}`,
  investor: `${DEALS_FIELDS_FOR_ALL},${EXTRA_FILED_BROKER_DEALS},${EXTRA_FIELDS_INVESTOR_DEALS}`,
};

// deals stages
export const DEAL_STAGES = {
  APPROVED: "Approved",
  NEW_DEAL: "New Deal",
  MORE_INFO_NEEDED: "More Information Needed",
  UNDERWRITING: "Underwriting",
  CLOSED_WON: "Closed Won",
  PRE_APPROVAL_SENT: "Pre Approval Sent",
  FUNDED: "Funded",
  DEAL_FULLY_CLOSED: "Deal Fully Closed",
  DENIED: "Denied",
  Pre_Approval_Expired: "Pre Approval Expired",
};

// deals filter
export const DEALS_FILTERS = {
  ALL: "all",
  CLOSED: "closed",
  OPEN: "open",
};

export const ACTIONS = {
  REVIEW_EMAIL: "Please review your email for final agreement document for",
  REVIEW_DOC_PAGE: "Please review document page to see the required doc.",
};

// days name
export const DAYS_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MILLISEC_IN_1DAY = 86400000;
