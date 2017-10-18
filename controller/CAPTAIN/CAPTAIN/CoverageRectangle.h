#pragma once
#include "TaskData.h"
#include "Coordinate.h"

class CoverageRectangle :
	public TaskData
{
public:
	CoverageRectangle(const Coordinate start_position, const Coordinate end_position );
	~CoverageRectangle();

	Coordinate get_start_position() const;
	Coordinate get_end_position() const;

private:
	Coordinate start_position_;
	Coordinate end_position_;
};

