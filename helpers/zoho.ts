import { EnvManager } from "../config";
import {
  ALL_ROLE_DEAL_FIELDS,
  BROKER_PROFILE_FIELDS,
  DEALS_FIELDS_FOR_ALL,
  DEAL_FIELDS,
  ENV_KEYS,
  HTTP_STATUS,
  HTTP_VERBS,
  REFERRAL_CONTACTS_FIELDS,
  REFERRAL_FIELDS,
  USER_ROLES,
  ZOHO_API_PATHS,
} from "../constants";
import { HelperResponsePOD } from "../pod";
import { httpRequest } from "./http-request";
import { formatAccessToken, isEqual } from "./utility";

/**
 * fetch and return the details from zoho crm according to the user role
 * @param email
 * @param role
 * @returns
 */
export const getUserFromZohoCrm = async (email: string, role: string) => {
  try {
    const envManager = EnvManager.getInsatnce();
    const baseUrl = envManager.getEnv(ENV_KEYS.ZOHO_CRM_BASE_API_URL);
    const acccessToken = envManager.getEnv(ENV_KEYS.ZOHO_ACCESS_TOKEN) || "";

    const roleBasedPath = isEqual(role, USER_ROLES.AGENT)
      ? ZOHO_API_PATHS.CONTACTS
      : isEqual(role, USER_ROLES.BROKER) ||
        isEqual(role, USER_ROLES.BROKER_ADMIN)
      ? ZOHO_API_PATHS.BROKERAGE
      : isEqual(role, USER_ROLES.INVESTOR)
      ? ZOHO_API_PATHS.INVESTOR
      : ZOHO_API_PATHS.REFERRAL;
    const searchUserUrl = `${baseUrl}${roleBasedPath}${ZOHO_API_PATHS.SEARCH}`;
    let queryParam;
    if (role === USER_ROLES.AGENT)
      queryParam = { criteria: `(Email:equals:${email})` };
    else {
      queryParam = {
        email,
      };
    }

    const contactSearchResponse = await httpRequest(
      HTTP_VERBS.GET,
      searchUserUrl,
      null,
      {
        params: queryParam,
        headers: {
          authorization: formatAccessToken(acccessToken),
        },
      }
    );

    if (contactSearchResponse.error) throw contactSearchResponse.error;
    const { data, status } = contactSearchResponse.data;

    // extract the user details from zoho responses
    let user = null;
    if (data?.data?.length) user = data.data[0];

    return new HelperResponsePOD(
      null,
      user,
      "",
      status === HTTP_STATUS.NO_CONTENT ? HTTP_STATUS.NOT_FOUND : status
    );
  } catch (err) {
    return new HelperResponsePOD(err);
  }
};

/**
 * fetch and return the agent deals from zoho crm
 * @param agentId
 * @returns
 */
export const getDeals = async (
  userId: string | null = null,
  role: string | null = null,
  page: number = 1,
  count: number = 200
) => {
  try {
    let searchUserUrl = "";
    const envManager = EnvManager.getInsatnce();
    const baseUrl = envManager.getEnv(ENV_KEYS.ZOHO_CRM_BASE_API_URL);
    const acccessToken = envManager.getEnv(ENV_KEYS.ZOHO_ACCESS_TOKEN) || "";

    // if user id and role is given then only fetch the user based deals
    // otherwise fetch deals for all roles eg. (for investor investing into deals)
    if (userId && role) {
      const roleBasedPath = isEqual(role, USER_ROLES.AGENT)
        ? ZOHO_API_PATHS.CONTACTS
        : isEqual(role, USER_ROLES.BROKER) ||
          isEqual(role, USER_ROLES.BROKER_ADMIN)
        ? ZOHO_API_PATHS.BROKERAGE
        : isEqual(role, USER_ROLES.INVESTOR)
        ? ZOHO_API_PATHS.INVESTOR
        : ZOHO_API_PATHS.REFERRAL;

      // craft the deals url for getting deals
      const dealsFieldAgenet = DEAL_FIELDS[role];
      searchUserUrl = `${baseUrl}${roleBasedPath}/${userId}${ZOHO_API_PATHS.DEALS}?fields=${dealsFieldAgenet}&page=${page}&per_page=${count}`;
    } else {
      searchUserUrl = `${baseUrl}${ZOHO_API_PATHS.DEALS}?fields=${ALL_ROLE_DEAL_FIELDS}&page=${page}&per_page=${count}`;
    }

    const dealsSearchResponse = await httpRequest(
      HTTP_VERBS.GET,
      searchUserUrl,
      null,
      {
        headers: {
          authorization: formatAccessToken(acccessToken),
        },
      }
    );

    if (dealsSearchResponse.error) throw dealsSearchResponse.error;
    const { data, status } = dealsSearchResponse.data;
    let _data = null;
    if (data?.data?.length) _data = data.data;

    return new HelperResponsePOD(null, _data, "", status);
  } catch (err) {
    return new HelperResponsePOD(err);
  }
};

/**
 * fetch the users details using user id
 * @param userId
 * @param role
 * @returns
 */
export const getDetails = async (userId: string, role: string) => {
  try {
    const envManager = EnvManager.getInsatnce();
    const baseUrl = envManager.getEnv(ENV_KEYS.ZOHO_CRM_BASE_API_URL);
    const acccessToken = envManager.getEnv(ENV_KEYS.ZOHO_ACCESS_TOKEN) || "";

    const roleBasedPath = isEqual(role, USER_ROLES.AGENT)
      ? ZOHO_API_PATHS.CONTACTS
      : isEqual(role, USER_ROLES.BROKER) ||
        isEqual(role, USER_ROLES.BROKER_ADMIN)
      ? ZOHO_API_PATHS.BROKERAGE
      : isEqual(role, USER_ROLES.INVESTOR)
      ? ZOHO_API_PATHS.INVESTOR
      : ZOHO_API_PATHS.REFERRAL;

    const fields =
      isEqual(role, USER_ROLES.BROKER) || isEqual(role, USER_ROLES.BROKER_ADMIN)
        ? BROKER_PROFILE_FIELDS
        : isEqual(role, USER_ROLES.REFERRAL)
        ? REFERRAL_FIELDS
        : "Pre_Approval_Forms";
    // craft the deals url for getting deals
    const searchUserUrl = `${baseUrl}${roleBasedPath}/${userId}?fields=${fields}`;

    const dealsSearchResponse = await httpRequest(
      HTTP_VERBS.GET,
      searchUserUrl,
      null,
      {
        headers: {
          authorization: formatAccessToken(acccessToken),
        },
      }
    );

    if (dealsSearchResponse.error) throw dealsSearchResponse.error;
    const { data, status } = dealsSearchResponse.data;
    let _data = null;
    if (data?.data?.length) _data = data.data[0];

    return new HelperResponsePOD(null, _data, "", status);
  } catch (err) {
    return new HelperResponsePOD(err);
  }
};

/**
 * fetch the referal contacts
 * @param userId
 * @param role
 * @returns
 */
export const getReferralContacts = async (userId: string, page: number = 1) => {
  try {
    const envManager = EnvManager.getInsatnce();
    const baseUrl = envManager.getEnv(ENV_KEYS.ZOHO_CRM_BASE_API_URL);
    const acccessToken = envManager.getEnv(ENV_KEYS.ZOHO_ACCESS_TOKEN) || "";

    // craft the deals url for getting deals
    const searchUserUrl = `${baseUrl}${ZOHO_API_PATHS.REFERRAL}/${userId}${ZOHO_API_PATHS.CONTACTS}?fields=${REFERRAL_CONTACTS_FIELDS}&page=${page}&per_page=200`;

    const dealsSearchResponse = await httpRequest(
      HTTP_VERBS.GET,
      searchUserUrl,
      null,
      {
        headers: {
          authorization: formatAccessToken(acccessToken),
        },
      }
    );

    if (dealsSearchResponse.error) throw dealsSearchResponse.error;
    const { data, status } = dealsSearchResponse.data;

    return new HelperResponsePOD(null, data?.data, "", status);
  } catch (err) {
    return new HelperResponsePOD(err);
  }
};

/**
 * get the deals for all current pages
 * @param userId
 * @param role
 * @returns
 */
export const getAllDeals = async (
  userId: string | null = null,
  role: string | null = null
) => {
  const allDeals: any[] = [];
  try {
    let page = 1;
    while (true) {
      const dealsResponse = await getDeals(userId, role, page);

      // check for any error
      if (dealsResponse.error) throw dealsResponse.error;

      if (
        dealsResponse.data?.length &&
        dealsResponse.statusCode !== HTTP_STATUS.NO_CONTENT
      ) {
        allDeals.push(...dealsResponse.data);
        page++;
      } else break;

      if (dealsResponse.data?.length < 200) break;
    }
    return new HelperResponsePOD(null, allDeals, "", HTTP_STATUS.OK);
  } catch (err) {
    console.log("Error while getting the all deals");
    if (!allDeals.length) {
      return new HelperResponsePOD(err);
    }
    return new HelperResponsePOD(null, allDeals, "", HTTP_STATUS.OK);
  }
};

/**
 * get all referral contacts
 * @param userId
 * @returns
 */
export const getAllReferralContacts = async (userId: string) => {
  const allDeals: any[] = [];
  try {
    let page = 1;
    while (true) {
      const dealsResponse = await getReferralContacts(userId, page);

      // check for any error
      if (dealsResponse.error) throw dealsResponse.error;

      if (
        dealsResponse.data?.length &&
        dealsResponse.statusCode !== HTTP_STATUS.NO_CONTENT
      ) {
        allDeals.push(...dealsResponse.data);
        page++;
      } else return new HelperResponsePOD(null, allDeals, "", HTTP_STATUS.OK);
    }
  } catch (err) {
    console.log("Error while getting the all deals");
    if (!allDeals.length) {
      return new HelperResponsePOD(err);
    }
    return new HelperResponsePOD(null, allDeals, "", HTTP_STATUS.OK);
  }
};
