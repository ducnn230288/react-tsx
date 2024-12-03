import { createAsyncThunk, type ActionReducerMapBuilder } from '@reduxjs/toolkit';

import { EStatusState } from '@/enums';
import type { IMUser, IResetPassword } from '@/interfaces/model';
import { API, C_API, KEY_REFRESH_TOKEN, KEY_TOKEN, KEY_USER } from '@/utils';
import type { StateGlobal } from '../state';

/**
 * RReducer class represents a reducer for global state.
 * It handles pending, fulfilled, and rejected actions.
 */
class RReducer {
  public action;
  public reducer;
  public pending = (_, __) => {};
  public fulfilled = (_, __) => {};
  public rejected = (_, __) => {};
  public constructor() {
    this.reducer = (builder: ActionReducerMapBuilder<StateGlobal>) => {
      builder
        .addCase(this.action.pending, (state, action) => {
          state.isLoading = true;
          state.status = EStatusState.Idle;
          this.pending(state, action);
        })

        .addCase(this.action.fulfilled, (state, action) => {
          state.isLoading = false;
          this.fulfilled(state, action);
        })

        .addCase(this.action.rejected, (state, action) => {
          state.isLoading = false;
          this.rejected(state, action);
        });
    };
  }
}
/**
 * Represents a class that handles the retrieval of a user profile.
 */
class GetProfile extends RReducer {
  public constructor(name: string) {
    super();
    this.action = createAsyncThunk(name + '/profile', async () => {
      const { data } = await API.get<IMUser>({ url: `${C_API.Auth}/profile` });
      return data || {};
    });

    this.fulfilled = (state, action) => {
      if (action.payload) {
        state.data = action.payload;
        state.user = action.payload;
        localStorage.setItem(KEY_USER, JSON.stringify(action.payload));
        state.status = EStatusState.Idle;
      }
    };
  }
}
/**
 * Represents a class for putting a user profile.
 */
class PutProfile extends RReducer {
  public constructor(name: string) {
    super();
    this.action = createAsyncThunk(name + '/putProfile', async (values: IMUser) => {
      const { data } = await API.put<{ user: IMUser; token: string; refreshToken: string }>({
        url: `${C_API.Auth}/profile`,
        values,
      });
      if (data) {
        localStorage.setItem(KEY_TOKEN, data?.token);
        localStorage.setItem(KEY_REFRESH_TOKEN, data?.refreshToken);
      }
      return data!.user;
    });

    this.pending = (state, action) => {
      state.data = { ...JSON.parse(JSON.stringify(state.data)), ...JSON.parse(JSON.stringify(action.meta.arg)) };
    };
    this.fulfilled = (state, action) => {
      if (action.payload) {
        localStorage.setItem(KEY_USER, JSON.stringify(action.payload));
        state.user = action.payload;
        state.status = EStatusState.IsFulfilled;
      }
    };
  }
}
/**
 * Represents a class for handling login functionality.
 * @class
 */
class PostLogin extends RReducer {
  public constructor(name: string) {
    super();
    this.action = createAsyncThunk(name + '/login', async (values: { password: string; username: string }) => {
      const { data } = await API.post<{ user: IMUser; token: string; refreshToken: string }>({
        url: `${C_API.Auth}/login`,
        values,
        params: { include: 'role' },
      });
      if (data) {
        localStorage.setItem(KEY_TOKEN, data?.token);
        localStorage.setItem(KEY_REFRESH_TOKEN, data?.refreshToken);
      }
      return data!.user;
    });

    this.pending = (state, action) => {
      state.data = action.meta.arg;
    };
    this.fulfilled = (state, action) => {
      if (action.payload) {
        localStorage.setItem(KEY_USER, JSON.stringify(action.payload));
        state.user = action.payload;
        state.data = undefined;
        state.status = EStatusState.IsFulfilled;
      }
    };
  }
}
/**
 * Represents a class for patching forgotten passwords.
 */
class PostForgottenPassword extends RReducer {
  public constructor(name: string) {
    super();
    this.action = createAsyncThunk(name + '/forgotten-password', async (values: { email: string }) => {
      await API.post({ url: `${C_API.Auth}/forgotten-password`, values });
      return true;
    });

    this.pending = (state, action) => {
      state.data = action.meta.arg;
    };
    this.fulfilled = state => {
      state.status = EStatusState.IsFulfilled;
    };
  }
}
/**
 * Represents a class for handling OTP confirmation.
 */
class PostOtpConfirmation extends RReducer {
  public constructor(name: string) {
    super();
    this.action = createAsyncThunk(name + '/otp-confirmation', async (values: { email: string; otp: string }) => {
      await API.post({ url: `${C_API.Auth}/otp-confirmation`, values });
      return true;
    });

    this.pending = (state, action) => {
      state.data = action.meta.arg;
    };
    this.fulfilled = (state, action) => {
      if (action.payload) {
        state.status = EStatusState.IsFulfilled;
      }
    };
  }
}
/**
 * Represents a class for resetting password using patch method.
 */
class PostResetPassword extends RReducer {
  public constructor(name: string) {
    super();
    this.action = createAsyncThunk(name + '/reset-password', async (values: IResetPassword) => {
      await API.post({ url: `${C_API.Auth}/reset-password`, values });
      return true;
    });

    this.pending = (state, action) => {
      state.data = action.meta.arg;
    };
    this.fulfilled = state => {
      state.data = {};
      state.status = EStatusState.IsFulfilled;
    };
  }
}

const name = 'Auth';
/**
 * RGlobal is an object that contains various service methods for global functionality.
 * Each property represents a specific service method.
 */
export default {
  getProfile: new GetProfile(name),
  putProfile: new PutProfile(name),
  postLogin: new PostLogin(name),
  postForgottenPassword: new PostForgottenPassword(name),
  postOtpConfirmation: new PostOtpConfirmation(name),
  postResetPassword: new PostResetPassword(name),
};
