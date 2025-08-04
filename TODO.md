# Food Calorie App - Immediate TODO List

## 🚀 Quick Wins to Implement Next (Priority Order)

### 1. Meal Categorization (1-2 days)
- [ ] Add `meal_type` field to `calorie_results` table
- [ ] Add dropdown in analysis results UI
- [ ] Implement automatic time-based meal detection (morning/afternoon/evening)
- [ ] Update history view to show meal categories

### 2. Basic Progress Tracking (3-5 days)  
- [ ] Create daily calorie summary endpoint
- [ ] Add simple line chart to frontend (Chart.js or Recharts)
- [ ] Build weekly overview component
- [ ] Add "Today's Progress" section to main page

### 3. User Profile & Goals Setup (1 week)
- [ ] Create `user_profiles` and `nutrition_goals` database tables
- [ ] Build user profile form component
- [ ] Add goal-setting wizard
- [ ] Implement progress calculation against goals

### 4. Enhanced History Search (2-3 days)
- [ ] Add search bar to history component
- [ ] Implement date range filtering
- [ ] Add meal type filtering
- [ ] Improve pagination and infinite scroll

## 🛠️ Technical Setup Tasks

### Database Updates
```sql
-- Add meal categorization
ALTER TABLE calorie_results ADD COLUMN meal_type TEXT;
CREATE INDEX idx_calorie_results_meal_type ON calorie_results(meal_type);

-- Add user profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  age INTEGER,
  weight_kg DECIMAL,
  height_cm DECIMAL,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add nutrition goals
CREATE TABLE nutrition_goals (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  daily_calories INTEGER,
  protein_g DECIMAL,
  carbs_g DECIMAL,
  fat_g DECIMAL,
  goal_type TEXT DEFAULT 'maintain', -- maintain, lose, gain
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Frontend Components Needed
- [ ] `MealCategoryDropdown` component
- [ ] `ProgressChart` component  
- [ ] `UserProfileForm` component
- [ ] `GoalSettingWizard` component
- [ ] `DailySummary` component
- [ ] `SearchAndFilter` component for history

### API Endpoints to Add
- [ ] `GET /api/user/profile` - Get user profile
- [ ] `POST /api/user/profile` - Create/update profile
- [ ] `GET /api/user/goals` - Get nutrition goals
- [ ] `POST /api/user/goals` - Set nutrition goals
- [ ] `GET /api/user/progress?date=YYYY-MM-DD` - Get daily progress
- [ ] `GET /api/user/summary?period=week|month` - Get progress summary

## 📋 Implementation Notes

### For Meal Categorization:
- Use time-based defaults: 6-11am = breakfast, 11am-4pm = lunch, 4-9pm = dinner, 9pm+ = snack
- Allow manual override in UI
- Add meal icons: 🍳 breakfast, 🥗 lunch, 🍽️ dinner, 🍪 snack

### For Progress Tracking:
- Calculate daily totals from all meals
- Show progress bars for calories, protein, carbs, fat
- Use color coding: green = on track, yellow = close, red = over/under
- Add trend indicators (↗️ ↘️ ➡️)

### For User Goals:
- Use standard formulas for BMR calculation (Mifflin-St Jeor)
- Adjust for activity level multipliers
- Default goals based on maintain/lose/gain weight
- Allow custom goal overrides

## 🎯 Success Metrics for Phase 1

- [ ] 90%+ users set meal categories for their food analyses
- [ ] 70%+ users complete profile setup within first 3 analyses
- [ ] 50%+ users return the next day to check progress
- [ ] Average session time increases by 30%
- [ ] User retention at 7 days improves

## 📅 Timeline
- **Week 1**: Meal categorization + database setup
- **Week 2**: Progress tracking basics
- **Week 3**: User profiles and goals
- **Week 4**: Enhanced history and polish

*Start with meal categorization as it's the foundation for everything else!*