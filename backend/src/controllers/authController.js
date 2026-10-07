import { db } from "../database/db.js";
import { otpService } from "../services/otpService.js";
import { verifyFirebaseToken } from "../services/firebaseAdmin.js";
import { supabase, isSupabaseConfigured } from "../database/supabaseClient.js";

/**
 * Format and normalize Indian mobile numbers
 */
function normalizeMobile(mobile) {
  if (!mobile) return "";
  const digits = String(mobile).replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return last10.length === 10 ? `+91${last10}` : mobile;
}

/**
 * Robust User Lookup across Supabase Cloud (permanent) and SQLite (local cache)
 */
async function findUser(mobile, email) {
  const digits = mobile ? String(mobile).replace(/\D/g, "") : "";
  const last10 = digits.slice(-10);
  const withPlus91 = last10.length === 10 ? `+91${last10}` : "";
  const targetEmail = email ? email.trim().toLowerCase() : "";

  // 1. Check Supabase Cloud first (permanent cloud database)
  if (isSupabaseConfigured && supabase) {
    try {
      if (last10) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .or(`mobile.eq.${withPlus91},mobile.eq.${last10},mobile.ilike.%${last10}%`)
          .limit(1);

        if (!error && data && data.length > 0) {
          const u = data[0];
          // Keep local SQLite hot cache in sync
          try {
            db.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, mobile, role, avatar, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              u.id,
              u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Forma Member",
              u.email || null,
              u.mobile,
              u.role || "customer",
              u.avatar || null,
              u.created_at || new Date().toISOString()
            );
          } catch {}
          return u;
        }
      }

      if (targetEmail) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", targetEmail)
          .limit(1);

        if (!error && data && data.length > 0) {
          const u = data[0];
          try {
            db.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, mobile, role, avatar, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              u.id,
              u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Forma Member",
              u.email || null,
              u.mobile,
              u.role || "customer",
              u.avatar || null,
              u.created_at || new Date().toISOString()
            );
          } catch {}
          return u;
        }
      }
    } catch (err) {
      console.warn("Supabase profile lookup notice:", err.message);
    }
  }

  // 2. Fallback to local SQLite cache
  try {
    if (withPlus91) {
      let localUser = db.prepare("SELECT * FROM users WHERE mobile = ? OR mobile = ?").get(withPlus91, last10);
      if (!localUser) {
        localUser = db.prepare("SELECT * FROM users WHERE mobile LIKE ?").get(`%${last10}`);
      }
      if (localUser) return localUser;
    }

    if (targetEmail) {
      const localUser = db.prepare("SELECT * FROM users WHERE email = ?").get(targetEmail);
      if (localUser) return localUser;
    }
  } catch (err) {
    console.warn("Local SQLite user lookup notice:", err.message);
  }

  return null;
}

/**
 * Helper to split full name into firstName and lastName
 */
function splitName(fullName, first, last) {
  const f = first || (fullName ? fullName.trim().split(" ")[0] : "Forma");
  const l =
    last ||
    (fullName && fullName.trim().split(" ").length > 1
      ? fullName.trim().split(" ").slice(1).join(" ")
      : "Member");
  return { firstName: f, lastName: l, name: `${f} ${l}`.trim() };
}

export const authController = {
  /**
   * Send Real 6-Digit Verification OTP
   * POST /api/auth/send-otp
   */
  async sendOtp(req, res) {
    try {
      const { mobile, email, purpose = "login" } = req.body;

      if (!mobile && !email) {
        return res.status(400).json({
          success: false,
          message: "Mobile number or email is required to send verification code.",
        });
      }

      let cleanMobile = mobile ? normalizeMobile(mobile) : "";
      let targetEmail = email ? email.trim().toLowerCase() : "";
      let existingUser = await findUser(cleanMobile, targetEmail);

      // 3. For login: only registered users can login!
      if (purpose === "login") {
        if (!existingUser) {
          return res.status(404).json({
            success: false,
            isUnregistered: true,
            message: "No registered account found with this number/email. Please register first to continue.",
          });
        }
        // Automatically route OTP to their registered email!
        if (existingUser.email) {
          targetEmail = existingUser.email;
        }
        if (existingUser.mobile) {
          cleanMobile = existingUser.mobile;
        }
      }

      // 4. For register: check if user already exists
      if (purpose === "register") {
        if (existingUser) {
          return res.status(409).json({
            success: false,
            isRegistered: true,
            message: "An account is already registered with this mobile/email. Please sign in instead.",
          });
        }
      }

      // Helper to mask email: e.g. yashcodes17@gmail.com -> y*****7@gmail.com
      const maskedEmail = targetEmail
        ? targetEmail.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => `${a}${"*".repeat(Math.min(b.length, 5))}${c}`)
        : "";

      // 5. Generate secure real OTP and send to Email inbox
      const { otp, expiresAt, emailDispatched } = await otpService.generateOTP({
        mobile: cleanMobile,
        email: targetEmail,
        name: existingUser ? existingUser.name : "Valued Member",
        purpose,
      });

      const deliveryMessage = targetEmail
        ? `Verification code dispatched to your email (${maskedEmail}). Valid for 5 minutes.`
        : `Verification code sent to ${cleanMobile}. Valid for 5 minutes.`;

      return res.json({
        success: true,
        message: deliveryMessage,
        mobile: cleanMobile,
        email: targetEmail,
        maskedEmail,
        emailDispatched,
        expiresAt,
        devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      });
    } catch (err) {
      console.error("Send OTP error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification code. Please try again.",
      });
    }
  },

  /**
   * Register a new user into the database with real OTP verification
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const { name, firstName, lastName, email, mobile, password, otp } = req.body;

      if (!mobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile number is required for registration.",
        });
      }

      const cleanMobile = normalizeMobile(mobile);
      if (!/^\+91[6-9]\d{9}$/.test(cleanMobile)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 10-digit Indian mobile number (starts with 6-9).",
        });
      }

      // 1. Verify Authentication (via Firebase or real SMS OTP)
      if (req.body.firebaseToken) {
        const decoded = await verifyFirebaseToken(req.body.firebaseToken);
        if (!decoded) {
          return res.status(401).json({
            success: false,
            message: "Firebase verification expired or invalid. Please retry.",
          });
        }
      } else if (!otp) {
        return res.status(400).json({
          success: false,
          message: "Verification code is required to complete registration.",
        });
      } else {
        const otpResult = otpService.verifyOTP(cleanMobile, otp, "register");
        if (!otpResult.success) {
          return res.status(400).json({
            success: false,
            message: otpResult.message,
          });
        }
      }

      const normalizedEmail = email ? email.trim().toLowerCase() : null;

      // 2. Check if user already exists in database (Supabase Cloud + SQLite)
      const existingUser = await findUser(cleanMobile, normalizedEmail);

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "An account is already registered with this mobile number or email. Please sign in instead.",
        });
      }

      // 3. Prepare user object
      const { firstName: fName, lastName: lName, name: fullName } = splitName(
        name,
        firstName,
        lastName
      );
      const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = new Date().toISOString();

      // 4. Save into Database (SQLite local cache + Supabase Cloud)
      try {
        const insertUser = db.prepare(`
          INSERT INTO users (id, name, email, mobile, password_hash, role, avatar, created_at)
          VALUES (@id, @name, @email, @mobile, @password_hash, @role, @avatar, @created_at)
        `);

        insertUser.run({
          id: userId,
          name: fullName,
          email: normalizedEmail,
          mobile: cleanMobile,
          password_hash: password || null,
          role: "customer",
          avatar: null,
          created_at: createdAt,
        });
      } catch (dbErr) {
        console.warn("Local SQLite user insert notice:", dbErr.message);
      }

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from("profiles").upsert({
            id: userId,
            name: fullName,
            first_name: fName,
            last_name: lName,
            email: normalizedEmail,
            mobile: cleanMobile,
            role: "customer",
            created_at: createdAt,
          });
        } catch (sbErr) {
          console.warn("Supabase profile sync notice:", sbErr.message);
        }
      }

      const userResponse = {
        id: userId,
        name: fullName,
        firstName: fName,
        lastName: lName,
        email: normalizedEmail || "",
        mobile: cleanMobile,
        role: "customer",
        joinedAt: new Date(createdAt).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
      };

      return res.status(201).json({
        success: true,
        message: "Account verified and registered successfully.",
        data: userResponse,
        token: `forma_token_${userId}`,
      });
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Registration failed. Please try again.",
      });
    }
  },

  /**
   * Login user - Only registered users in the database can log in
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { mobile, email, otp, password } = req.body;

      if (!mobile && !email) {
        return res.status(400).json({
          success: false,
          message: "Mobile number or email is required to sign in.",
        });
      }

      const cleanMobile = mobile ? normalizeMobile(mobile) : "";
      const cleanEmail = email ? email.trim().toLowerCase() : "";

      // 1. Search database (Supabase Cloud + SQLite)
      const user = await findUser(cleanMobile, cleanEmail);

      // 2. ONLY REGISTERED USERS CAN LOG IN
      if (!user) {
        return res.status(404).json({
          success: false,
          isUnregistered: true,
          message:
            "No registered account found with this number/email. Please create an account first to sign in.",
        });
      }

      // 4. Verify Real OTP, Firebase Token, or Password
      if (req.body.firebaseToken) {
        const decoded = await verifyFirebaseToken(req.body.firebaseToken);
        if (!decoded) {
          return res.status(401).json({
            success: false,
            message: "Firebase verification expired or invalid. Please sign in again.",
          });
        }
      } else if (otp) {
        const targetMobile = user.mobile || cleanMobile;
        const targetEmail = user.email || "";
        let otpResult = otpService.verifyOTP(targetMobile, otp, "login");
        if (!otpResult.success && targetEmail) {
          otpResult = otpService.verifyOTP(targetEmail, otp, "login");
        }
        if (!otpResult.success) {
          return res.status(400).json({
            success: false,
            message: otpResult.message,
          });
        }
      } else if (password && user.password_hash) {
        if (password !== user.password_hash) {
          return res.status(401).json({
            success: false,
            message: "Incorrect password. Please verify and try again.",
          });
        }
      } else if (!password && !otp) {
        return res.status(400).json({
          success: false,
          message: "Please enter the verification code or password.",
        });
      }

      const { firstName, lastName, name: fullName } = splitName(user.name);

      const userResponse = {
        id: user.id,
        name: fullName,
        firstName,
        lastName,
        email: user.email || "",
        mobile: user.mobile,
        role: user.role || "customer",
        avatar: user.avatar || null,
        joinedAt: user.created_at
          ? new Date(user.created_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })
          : "Forma Member",
      };

      return res.json({
        success: true,
        message: "Signed in successfully.",
        data: userResponse,
        token: `forma_token_${user.id}`,
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Sign in failed. Please try again.",
      });
    }
  },

  /**
   * Admin Login
   * POST /api/auth/admin-login
   */
  async adminLogin(req, res) {
    try {
      const { email, password } = req.body;
      const normalizedEmail = (email || "").trim().toLowerCase();
      const providedPassword = (password || "").trim();

      if (
        normalizedEmail !== "admin@trial.com" ||
        providedPassword !== "kunal00700@"
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid administrator credentials. Access denied.",
        });
      }

      // Ensure admin exists in database
      const existingAdmin = db
        .prepare("SELECT * FROM users WHERE email = ?")
        .get("admin@trial.com");

      if (!existingAdmin) {
        db.prepare(`
          INSERT OR REPLACE INTO users (id, name, email, mobile, password_hash, role, avatar, created_at)
          VALUES ('usr_admin_master', 'Studio Administrator', 'admin@trial.com', '+919999999999', 'kunal00700@', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', CURRENT_TIMESTAMP)
        `).run({});
      }

      const adminUser = {
        id: "usr_admin_master",
        name: "Studio Administrator",
        firstName: "Studio",
        lastName: "Admin",
        email: "admin@trial.com",
        mobile: "+919999999999",
        role: "admin",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        joinedAt: "Master Admin",
      };

      return res.json({
        success: true,
        message: "Studio Administrator access authorized.",
        data: adminUser,
        token: "admin_master_token",
      });
    } catch (err) {
      console.error("Admin login error:", err);
      return res.status(500).json({
        success: false,
        message: "Admin authentication failure.",
      });
    }
  },

  /**
   * Check if a mobile or email is already registered
   * GET /api/auth/check
   */
  async checkUser(req, res) {
    try {
      const { mobile, email } = req.query;
      let user = null;

      if (mobile) {
        const cleanMobile = normalizeMobile(mobile);
        user = db.prepare("SELECT id, mobile FROM users WHERE mobile = ?").get(cleanMobile);
      }

      if (!user && email) {
        const cleanEmail = String(email).trim().toLowerCase();
        user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(cleanEmail);
      }

      return res.json({
        success: true,
        isRegistered: Boolean(user),
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Get all registered customers (Admin only)
   * GET /api/auth/customers
   */
  async getCustomers(req, res) {
    try {
      const users = db.prepare("SELECT id, name, email, mobile, role, created_at FROM users").all();
      return res.json({
        success: true,
        data: users || [],
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};
